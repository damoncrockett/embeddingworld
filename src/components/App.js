import React, { useState, useRef, useEffect } from 'react';
import { embeddingModels, initializeEmbedder, getEmbeddings } from '../../utils/embed';
import { reduceEmbeddings } from '../../utils/reduce';
import { basemaps, sampleRandomWords, iconPath } from '../../utils/text';
import Radio from './Radio';
import BasemapToggles from './BasemapToggles';
import World from './World';
import Loading from './Loading';

import { 
    getMaxPairwiseDistance, 
    findBiggestOutlier, 
    findShortestPath, 
    getPathWeights, 
    weightBinner,
    totalCoordMovement,
    generatePairwiseComparisons,
    cosineDistance
 } from '../../utils/geometry';

import Meter from './Meter';
import { returnDomain } from '../../utils/data';
import Selections, { selectionSlotStatus } from './Selections';
import PathString from './PathString';

export default function App() {

    const [loading, setLoading] = useState(true);
    const [loadingInset, setLoadingInset] = useState(false);
    const [mapLevel, setMapLevel] = useState('map'); 
    const [mapList, setMapList] = useState([]);
    const [mapData, setMapData] = useState(null);
    const [selectionsData, setSelectionsData] = useState(null);
    const [graphData, setGraphData] = useState({lines: [], path: []});
    const [pathSmpsAndWeightChars, setPathSmpsAndWeightChars] = useState({"smps": [], "weights": []});
    const [clickChange, setClickChange] = useState(null);
    const [basemapLocked, setBasemapLocked] = useState(false); 
    const [embeddingModel, setEmbeddingModel] = useState(embeddingModels[5]);
    const [reducer, setReducer] = useState('pca');
    const [ranks, setRanks] = useState(false);
    const [embedderChangeCounter, setEmbedderChangeCounter] = useState(0);
    const [maxDistance, setMaxDistance] = useState(0);
    const [maxPair, setMaxPair] = useState(null);
    const [maxZscore, setMaxZscore] = useState(0);
    const [maxZscoreSample, setMaxZscoreSample] = useState(null); 
    const [meterModelSignal, setMeterModelSignal] = useState(0);
    const [isSpreadMeterHovered, setIsSpreadMeterHovered] = useState(false);
    const [isOutlierMeterHovered, setIsOutlierMeterHovered] = useState(false);
    const [infoModal, setInfoModal] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selections, setSelections] = useState([null, null, null, null]);

    const inputRef = useRef(null);
    const embedderRef = useRef(null);
    const prevEmbeddingModel = useRef(embeddingModel);
    const prevMapData = useRef(null);

    const clearRemovedSelections = () => {

        if (selections.some(item => item !== null && !mapList.some(e => e.smp === item))) {
               
            const newSelections = selections.map(item => 
                mapList.some(e => e.smp === item) ? item : null);

            setSelections(newSelections);
        }
    }

    const handleFetchWords = () => {
        fetch(returnDomain() + 'txt/wikiwords.txt')
          .then(response => response.text())
          .then(text => {
            const wordsArray = text.split('\n').map(line => line.trim()).filter(Boolean);
            const sampled = sampleRandomWords(wordsArray); 
            
            if (inputRef.current) {
              inputRef.current.value = sampled.join('\n'); 
              
              inputRef.current.focus();
              
              const length = inputRef.current.value.length;
              inputRef.current.setSelectionRange(length, length);
            }
          })
          .catch(error => {
            console.error('Failed to fetch the words file:', error);
          });
        };
      
    const handleBasemapToggle = async (name, isChecked) => {
        let currentList = [...mapList];
        const itemsToAddOrRemove = basemaps[name]; 
    
        if (isChecked) {
            const newItems = itemsToAddOrRemove.filter(item => !currentList.some(e => e.smp === item));
            if (newItems.length > 0) {
                const newEmbeddings = await getEmbeddings(newItems, embedderRef);
                const newItemsWithEmbeddings = newItems.map((item, index) => ({
                    smp: item,
                    vec: newEmbeddings[index],
                    lvl: 'b'
                }));
                setMapList(currentList.concat(newItemsWithEmbeddings));
            }
        } else {
            const filteredList = currentList.filter(item => !itemsToAddOrRemove.includes(item.smp));
            setMapList(filteredList);
        }
    };

    const handleClear = () => {

        if ( mapLevel === 'map' ) {
            setMapList(prevList => prevList.filter(item => item.lvl === 'b'))
        } else if ( mapLevel === 'base' ) {
            setMapList(prevList => prevList.filter(item => item.lvl === 'm'));

            const basemapToggles = document.querySelectorAll('.basemap-toggle-checkbox');
            basemapToggles.forEach(toggle => {
                toggle.checked = false;
            });
        } 
    }

    const handleBasemapLock = () => {
        
        // if there is nothing on the basemap, you can't lock the basemap
        if (!mapList.some(item => item.lvl === 'b')) return;
        
        setBasemapLocked(!basemapLocked);
    };
        
    const handleAdd = async () => {
        const inputValues = inputRef.current.value.split('\n')
            .map(item => item.trim())
            .filter(item => item && !mapList.some(e => e.smp === item)); 
        if (inputValues.length > 0) {
            const newEmbeddings = await getEmbeddings(inputValues, embedderRef);
            const newItemsWithEmbeddings = inputValues.map((item, index) => ({
                smp: item,
                vec: newEmbeddings[index],
                lvl: mapLevel === 'map' ? 'm' : 'b'
            }));
            setMapList(prevList => [...prevList, ...newItemsWithEmbeddings]);
        }
    
        inputRef.current.value = ''; 
    };
    
    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // prevents newline
            handleAdd(); 
        }
    }

    const handleRemoveSelection = (event) => {
        const index = Array.from(event.target.parentNode.children).indexOf(event.target);
        let newSelections = [...selections];
        newSelections[index] = null; 
        
        setSelections(newSelections);
    };
    
    useEffect(() => {
        initializeEmbedder(
            embeddingModel, 
            embedderRef, 
            setEmbedderChangeCounter,
            setLoading,
            setLoadingInset);
    }, [embeddingModel]);

    useEffect(() => {
        const recomputeEmbeddings = async () => {
            const samples = mapList.map(item => item.smp);
            const newEmbeddings = await getEmbeddings(samples, embedderRef);

            const updatedMapList = mapList.map((item, index) => ({
                ...item,
                vec: newEmbeddings[index],
            }));
    
            setMapList(updatedMapList);
        };
    
        recomputeEmbeddings();
    }, [embedderChangeCounter]);
    
    useEffect(() => {

        if ( !mapList.some(item => item.lvl === 'b') && basemapLocked ) {
            alert('You are fitting the basemap, but there is nothing on it. Exiting "FIT BASE" mode.')
            setBasemapLocked(false);
            return; // must return bc setBasemapLocked won't fire fast enough to prevent plotting error
        }

        const distanceFunctionName = reducer === 'pca' || reducer === 'paths' ? 'euclidean' : 'cosine';
        const { distance, pair } = getMaxPairwiseDistance(mapList.map(d => d.vec), distanceFunctionName);
        const { outlierIndex, zScore } = findBiggestOutlier(mapList.map(d => d.vec), distanceFunctionName);
        
        setMaxDistance(distance);
        setMaxZscore(zScore);
        
        // safer than saving just the indices, because they change a lot
        const maxPairSamples = pair ? [mapList[pair[0]].smp, mapList[pair[1]].smp] : null;
        const maxZscoreSample = outlierIndex ? mapList[outlierIndex].smp : null;
        
        setMaxPair(maxPairSamples);
        setMaxZscoreSample(maxZscoreSample);

        if ( prevEmbeddingModel.current !== embeddingModel ) setMeterModelSignal(prev => prev + 1);
        prevEmbeddingModel.current = embeddingModel;

        let coords;
        let mapListAndCoords;
                              
        if (reducer === 'project' || reducer === 'nearest' ) {

            setGraphData({lines: [], path: []}); 
            coords = reduceEmbeddings(mapList, basemapLocked, reducer, selections, ranks);

            mapListAndCoords = mapList.map((item, index) => ({
                ...item,
                x: coords[index][0],
                y: coords[index][1]
            }));

            prevMapData.current = null;
            
        } else if ( reducer === 'paths' || reducer === 'pca' ) {

            let graphAndCoords;

            if ( reducer === 'pca' ) {

                setGraphData({lines: [], path: []});
                coords = reduceEmbeddings(mapList, basemapLocked, reducer, selections, ranks);

                const nonNullSelections = selections.filter(item => item !== null);

                if ( nonNullSelections.length > 1 ) {
                    const selectionVecs = nonNullSelections.map(smp => mapList.find(item => item.smp === smp).vec);
                    const allSelectionPairs = generatePairwiseComparisons(selectionVecs.length);
                    const allSelectionDistances = allSelectionPairs.map(pair => `${nonNullSelections[pair[0]]}—${cosineDistance(selectionVecs[pair[0]], selectionVecs[pair[1]]).toFixed(3)}—${nonNullSelections[pair[1]]}`);
                    const connectors = Array(allSelectionDistances.length - 1).fill(' ');

                    setPathSmpsAndWeightChars({"smps": allSelectionDistances, "weights": connectors});
                }

            } else if ( reducer === 'paths' ) {

                graphAndCoords = reduceEmbeddings(mapList, basemapLocked, reducer, selections, ranks);

                if (graphAndCoords.coords) {
                    coords = graphAndCoords.coords; 
                } else {
                    coords = [[0, 0]];
                }

            }

            if ( prevMapData.current === null ) {
                mapListAndCoords = mapList.map((item, index) => ({
                    ...item,
                    x: coords[index][0],
                    y: coords[index][1]
                }));
            } else {
                const candidateMapListAndCoords = mapList.map((item, index) => ({
                    ...item,
                    x: coords[index][0],
                    y: coords[index][1]
                }));

                const prevMapSmps = prevMapData.current.map(d => d.smp);
                const filteredCandidateMapListAndCoords = candidateMapListAndCoords.filter(d => prevMapSmps.includes(d.smp));
                const prevCoords = prevMapData.current.map(d => [d.x, d.y]);
                const filteredCandidateCoords = filteredCandidateMapListAndCoords.map(d => [d.x, d.y]);

                // avoid flipping the pca
                const signFlips = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
                const totalMovements = signFlips.map(signs => totalCoordMovement(prevCoords, filteredCandidateCoords, signs));
                const minMovementIndex = totalMovements.indexOf(Math.min(...totalMovements));
                const bestSigns = signFlips[minMovementIndex];

                coords = coords.map(coord => [coord[0] * bestSigns[0], coord[1] * bestSigns[1]]);

                mapListAndCoords = mapList.map((item, index) => ({
                    ...item,
                    x: coords[index][0],
                    y: coords[index][1]
                }));
            }

            prevMapData.current = mapListAndCoords;
            
            if ( reducer === 'paths' && graphAndCoords?.graph ) {
                
                const linesData = [];
                const addedLines = new Set();

                graphAndCoords.graph.forEach((value, key) => {
                    const startPoint = { x: coords[key][0], y: coords[key][1], smp: mapList[key].smp };
                    if (!startPoint) return;

                    value.connections.forEach(conn => {
                        const endPoint = { x: coords[conn.node][0], y: coords[conn.node][1], smp: mapList[conn.node].smp };
                        if (!endPoint) return;

                        const lineId = [startPoint.smp, endPoint.smp].sort().join('-'); // to avoid dupes

                        if (!addedLines.has(lineId)) {
                            linesData.push({
                                source: startPoint,
                                target: endPoint,
                                weight: weightBinner(conn.weight)
                            });

                            addedLines.add(lineId);
                        }
                    });
                });
                
                if ( selections[0] !== null && selections[1] !== null ) {
                    
                    const startNode = mapList.findIndex(item => item.smp === selections[0]);
                    const endNode = mapList.findIndex(item => item.smp === selections[1]);
                    const path = findShortestPath(graphAndCoords.graph, startNode, endNode);
                    
                    if (path) {
                        
                        const pathWeights = getPathWeights(graphAndCoords.graph, path);
                        const weightCharacters = pathWeights.map(w => weightBinner(w, "character"));
                        const smpPath = path.map(node => mapList[node].smp);
                        
                        setPathSmpsAndWeightChars({"smps": smpPath, "weights": weightCharacters});

                        const pathSegments = [];
                        for (let i = 0; i < smpPath.length - 1; i++) {
                            pathSegments.push(`${smpPath[i]}-${smpPath[i + 1]}`);
                            pathSegments.push(`${smpPath[i + 1]}-${smpPath[i]}`);
                        }

                        setGraphData({lines: linesData, path: pathSegments});
                    } else {
                        setGraphData({lines: linesData, path: []});
                        setPathSmpsAndWeightChars({"smps": [], "weights": []});
                    }
                } else {
                    setGraphData({lines: linesData, path: []});
                    setPathSmpsAndWeightChars({"smps": [], "weights": []});
                }

            } else if ( reducer !== 'pca' ) {
                setGraphData({lines: [], path: []}); 
                setPathSmpsAndWeightChars({"smps": [], "weights": []});
            }
        }

        setMapData(mapListAndCoords);

        // used for selection highlights
        // filter first for selections that have the `filled` class
        const filteredSelections = selections.filter((d, i) => selectionSlotStatus(d, i, reducer, selections) === 'filled');
        const selectedMapListAndCoords = mapListAndCoords.filter(d => filteredSelections.includes(d.smp));
        setSelectionsData(selectedMapListAndCoords);
    
    } , [mapList, basemapLocked, reducer, selections, ranks]);

    useEffect(() => {
        if ( clickChange && clickChange.changeType === 'switch' ) {
            const currentList = [...mapList];
            const index = currentList.findIndex(item => item.smp === clickChange.smp);
            currentList[index].lvl = currentList[index].lvl === 'm' ? 'b' : 'm';
            setMapList(currentList);
        } else if ( clickChange && clickChange.changeType === 'remove' ) {
            const currentList = [...mapList];
            const index = currentList.findIndex(item => item.smp === clickChange.smp);
            currentList.splice(index, 1);
            setMapList(currentList);
        }        
    }, [clickChange]);

    useEffect(() => {
        clearRemovedSelections();

    }, [mapList]);
    
    return (
        <>
            {loading ? <Loading /> : null}
            {loadingInset && <div className='loading-overlay'></div>}
            <div>
                <World 
                        mapData={mapData}
                        selectionsData={selectionsData}
                        graphData={graphData}
                        setClickChange={setClickChange}
                        isSpreadMeterHovered={isSpreadMeterHovered}
                        isOutlierMeterHovered={isOutlierMeterHovered}
                        maxPair={maxPair}
                        maxZscoreSample={maxZscoreSample}
                        selectMode={selectMode}
                        selections={selections}
                        setSelections={setSelections}
                        reducer={reducer} 
                />
                <div id='map-controls'>
                    <div id='input-group'>
                        <textarea placeholder='enter text samples separated by newlines...' id='text-input' ref={inputRef} onKeyDown={handleKeyDown}/>
                        <div id='add-group'>
                            <button id='add-button' onClick={handleAdd}>ADD</button>
                            <button id='randomWords' onClick={handleFetchWords}>RAND</button>
                        </div>
                        <div id='mapLevel-group'>
                            <Radio
                                choice={mapLevel}
                                choices={['map', 'base']}
                                onSwitch={(mapLevel) => setMapLevel(mapLevel)}
                                id='mapLevel'
                            />
                            <button id='clearButton' onClick={handleClear}>CLEAR</button>
                        </div>
                    </div>
                    <div id='model-group'>
                        {(reducer === 'nearest' || reducer === 'project') && <button id='base-fitter' className={ranks ? 'on' : 'off'} onClick={() => setRanks(ranks => !ranks)}>RANKS</button>}
                        {(reducer === 'pca' || reducer === 'paths') && <button id='base-fitter' className={basemapLocked ? 'on' : 'off'} onClick={handleBasemapLock}>FIT BASE</button>}
                        <select id='model-menu' onChange={e => {setEmbeddingModel(e.target.value); setLoadingInset(true);}} value={embeddingModel}>
                            {embeddingModels.map(model => (
                                <option key={model} value={model}>
                                    {model}
                                </option>
                            ))}
                        </select>
                    </div>
                    <BasemapToggles basemaps={basemaps} onToggle={handleBasemapToggle} />
                    <div id='layout-group'>
                        <Radio
                            choice={reducer}
                            choices={['pca', 'nearest', 'paths', 'project']}
                            onSwitch={reducer => setReducer(reducer)}
                            id='choose-reducer'
                        />
                        <div id='spreadMeter' onMouseEnter={() => setIsSpreadMeterHovered(true)} onMouseLeave={() => setIsSpreadMeterHovered(false)}>
                            <Meter key={'spread' + meterModelSignal} initialValue={maxDistance} labelText="Max Distance" className="meter" />
                        </div>
                        <div id='outlierMeter' onMouseEnter={() => setIsOutlierMeterHovered(true)} onMouseLeave={() => setIsOutlierMeterHovered(false)}>
                            <Meter key={'outlier' + meterModelSignal} initialValue={maxZscore} labelText="Max Z-Score" className="meter" />
                        </div>
                        <div id='select-group'>
                            <button id='select-mode' className={selectMode ? 'on' : 'off'} onClick={() => setSelectMode(prev => !prev)}>SELECT</button>
                            <Selections
                                selections={selections}
                                setSelections={setSelections}
                                handleRemoveSelection={handleRemoveSelection}
                                reducer={reducer} 
                            />
                        </div>
                    </div>
                </div>
                {(reducer === 'pca' || reducer === 'paths') && <PathString pathSmpsAndWeightChars={pathSmpsAndWeightChars} mapList={mapList} reducer={reducer} />}
                <div id='info-group'>
                    <a href="https://github.com/damoncrockett/embeddingworld" target='_blank'>
                        <svg id='github-icon' viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d={iconPath}></path>
                        </svg>
                    </a>
                    <div id='info-button' className='material-icons-outlined' onClick={() => setInfoModal(true)}>info</div>
                </div>
                {infoModal && 
                    <>
                        <div id='info-modal'></div>
                        <div id='info-modal-backdrop' onClick={() => setInfoModal(false)}></div>
                    </>
                }
            </div>
        </>
    ); 
}

