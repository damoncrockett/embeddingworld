import React, { useState, useRef, useEffect } from 'react';
import { embeddingModels, initializeEmbedder, getEmbeddings } from '../../utils/embed';
import { reduceEmbeddings } from '../../utils/reduce';
import { basemaps, sampleRandomWords, iconPath } from '../../utils/text';
import Radio from './Radio';
import BasemapToggles from './BasemapToggles';
import World from './World';
import Loading from './Loading';
import LoadingInset from './LoadingInset';
import { getMaxPairwiseDistance, findBiggestOutlier } from '../../utils/geometry';
import Meter from './Meter';
import { returnDomain } from '../../utils/data';
import Selections from './Selections';

export default function App() {

    const [loading, setLoading] = useState(true);
    const [loadingInset, setLoadingInset] = useState(false);
    const [mapLevel, setMapLevel] = useState('map'); 
    const [mapList, setMapList] = useState([]);
    const [mapData, setMapData] = useState(null);
    const [clickChange, setClickChange] = useState(null);
    const [basemapLocked, setBasemapLocked] = useState(false); 
    const [embeddingModel, setEmbeddingModel] = useState(embeddingModels[4]);
    const [reducer, setReducer] = useState('pca');
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

    const handleFetchWords = () => {
        fetch(returnDomain() + 'txt/mit10000.txt')
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

    useEffect(() => { // make sure deleted map items are removed from selections

        if (selections.every(item => mapList.some(e => e.smp === item))) return;
        
        const newSelections = selections.map(item => mapList.some(e => e.smp === item) ? item : null);
        setSelections(newSelections);

    }, [mapList]);
    
    useEffect(() => {

        if ( !mapList.some(item => item.lvl === 'b') && basemapLocked ) {
            alert('You are fitting the basemap, but there is nothing on it. Exiting "FIT BASE" mode.')
            setBasemapLocked(false);
            return; // must return bc setBasemapLocked won't fire fast enough to prevent plotting error
        }

        const distanceFunctionName = reducer === 'pca' ? 'euclidean' : 'cosine';
        const { distance, pair } = getMaxPairwiseDistance(mapList.map(d => d.vec), distanceFunctionName);
        const { outlierIndex, zScore } = findBiggestOutlier(mapList.map(d => d.vec), distanceFunctionName);
        
        setMaxDistance(distance);
        setMaxZscore(zScore);
        
        // safer than saving just the indices, because they change a lot
        const maxPairSamples = pair ? [mapList[pair[0]].smp, mapList[pair[1]].smp] : null;
        const maxZscoreSample = outlierIndex ? mapList[outlierIndex].smp : null;
        
        setMaxPair(maxPairSamples);
        setMaxZscoreSample(maxZscoreSample);
        
        const coords = reduceEmbeddings(mapList, basemapLocked, reducer, selections);

        if ( prevEmbeddingModel.current !== embeddingModel ) setMeterModelSignal(prev => prev + 1);

        prevEmbeddingModel.current = embeddingModel;
                        
        if (reducer !== 'paths') {
            
            const mapListAndCoords = mapList.map((item, index) => ({
            ...item,
            x: coords[index][0],
            y: coords[index][1]
        }));
        
        setMapData(mapListAndCoords);
        
        } else {
            
            setMapData(coords); // this is really 'graph'

        }
    
    } , [mapList, basemapLocked, reducer, selections]);

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
    
    return (
        loading ? <Loading /> :
        <div>
            <World 
                    mapData={mapData}
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
                    <button id='base-fitter' className={basemapLocked ? 'on' : 'off'} onClick={handleBasemapLock}>FIT BASE</button>
                    <select id='model-menu' onChange={e => {setEmbeddingModel(e.target.value); setLoadingInset(true);}} value={embeddingModel}>
                        {embeddingModels.map(model => (
                            <option key={model} value={model}>
                                {model}
                            </option>
                        ))}
                    </select>
                    {loadingInset && <LoadingInset />}
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
    );
    
}

