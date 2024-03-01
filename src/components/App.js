import React, { useState, useRef, useEffect } from 'react';
import { embeddingModels, initializeEmbedder, getEmbeddings } from '../../utils/embed';
import { reduceEmbeddings } from '../../utils/reduce';
import { basemaps, sampleRandomWords } from '../../utils/text';
import Radio from './Radio';
import BasemapToggles from './BasemapToggles';
import Map from './Map';
import isEqual from 'lodash/isEqual';
import Loading from './Loading';
import LoadingInset from './LoadingInset';

import { 
    computeAndRankPairwiseDistances, 
    spearmanRankCorrelation,
    projectPointOntoLine,
 } from '../../utils/geometry';

import Meter from './Meter';
import { returnDomain } from '../../utils/data'; 

export default function App() {

    const [loading, setLoading] = useState(true);
    const [loadingInset, setLoadingInset] = useState(false);
    const [mapLevel, setMapLevel] = useState('map'); 
    const [mapList, setMapList] = useState([]);
    const [mapData, setMapData] = useState(null);
    const [clickChange, setClickChange] = useState(null);
    const [basemapLocked, setBasemapLocked] = useState(false); 
    const [embeddingModel, setEmbeddingModel] = useState(embeddingModels[0]);
    const [reducer, setReducer] = useState('pca');
    const [embedderChangeCounter, setEmbedderChangeCounter] = useState(0);
    const [maxDistance, setMaxDistance] = useState(0);
    const [maxPair, setMaxPair] = useState(null); // [i, j] indices of the pair with max distance
    const [spearmanCorrelation, setSpearmanCorrelation] = useState(0);
    const [meterModelSignal, setMeterModelSignal] = useState(0);
    const [isMeterHovered, setIsMeterHovered] = useState(false);

    const inputRef = useRef(null);
    const embedderRef = useRef(null);
    const prevSmps = useRef(null);
    const prevEmbeddingModel = useRef(embeddingModel);
    const prevCoords = useRef(null);
    const prevReducer = useRef(reducer);
    const prevBasemapLocked = useRef(basemapLocked);

    const handleFetchWords = () => {
        fetch(returnDomain() + 'mit10000.txt')
          .then(response => response.text())
          .then(text => {
            const wordsArray = text.split('\n').map(line => line.trim()).filter(Boolean);
            const sampled = sampleRandomWords(wordsArray); // Assuming this function is defined
            
            if (inputRef.current) {
              inputRef.current.value = sampled.join('\n'); // Join the sampled words with newlines
              
              // Set focus to the textarea
              inputRef.current.focus();
              
              // Optional: Place the cursor at the end of the textarea content
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

    const clearAlert = "Clearing the basemap leaves less than 15 map items, and in this world, UMAP requires at least 15 samples.";

    const handleClearMap = () => {

        if ( reducer === 'umap' && mapList.filter(d => d.lvl === 'b').length < 15 ) {
            alert(clearAlert);
            return;
        }

        setMapList(prevList => prevList.filter(item => item.lvl === 'b'));
    }

    const handleClearBasemap = () => {

        if ( reducer === 'umap' && mapList.filter(d => d.lvl === 'm').length < 15 ) {
            alert(clearAlert);
            return;
        }

        setMapList(prevList => prevList.filter(item => item.lvl === 'm'));

        // uncheck all basemap toggles
        const basemapToggles = document.querySelectorAll('.basemap-toggle-checkbox');
        basemapToggles.forEach(toggle => {
            toggle.checked = false;
        });
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

    const handleReducer = (reducer) => {

        if ( reducer === 'umap' && mapList.length < 15 ) {
            alert('In this world, UMAP requires at least 15 samples.');
            return;
        }

        setReducer(reducer);
    }

    const handleProjectionMode = () => {
        setReducer(prev => prev === 'proj' ? prevReducer.current : 'proj');
    }

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

        // If all we've done is switch an item between the map and basemap, we don't recompute coords.
        // This wouldn't matter except that UMAP is non-deterministic and we don't want it to relocate items 
        // if nothing substantive has changed.
        const skipReduce = isEqual(prevSmps.current, mapList.map(d => d.smp)) && 
                              prevEmbeddingModel.current === embeddingModel &&
                              prevReducer.current === reducer &&
                              reducer === 'umap' &&
                              prevBasemapLocked.current === basemapLocked;

        const coords = skipReduce ? prevCoords.current : reduceEmbeddings(mapList, basemapLocked, reducer);

        // get Spearman correlation between pairwise distances in original space and in reduced space
        
        if ( mapList.length > 1 ) {

            const distanceFunctionName = reducer === 'pca' ? 'euclidean' : 'cosine';
            const originalRanks = computeAndRankPairwiseDistances(mapList.map(d => d.vec), distanceFunctionName);
            const reducedRanks = computeAndRankPairwiseDistances(coords, distanceFunctionName);
            const corr = spearmanRankCorrelation(originalRanks[0], reducedRanks[0]);
            setSpearmanCorrelation(corr);
            setMaxDistance(originalRanks[1]);

            // safer than saving just the indices, because they change a lot
            const maxPairSamples = [mapList[originalRanks[2][0]].smp, mapList[originalRanks[2][1]].smp];
            setMaxPair(maxPairSamples);

        } else {
            setSpearmanCorrelation(0);
            setMaxDistance(0);
            setMaxPair(null);
        }

        if ( prevEmbeddingModel.current !== embeddingModel ) setMeterModelSignal(prev => prev + 1);

        prevSmps.current = mapList.map(d => d.smp);
        prevEmbeddingModel.current = embeddingModel;
        prevCoords.current = coords;
        prevReducer.current = reducer;
        prevBasemapLocked.current = basemapLocked;
                        
        const mapListAndCoords = mapList.map((item, index) => ({
            ...item,
            x: coords[index][0],
            y: coords[index][1]
        }));
        
        setMapData(mapListAndCoords);
    
    } , [mapList, basemapLocked, reducer]);

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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <button id='randomWords' onClick={handleFetchWords}>RANDOM</button>
            <BasemapToggles basemaps={basemaps} onToggle={handleBasemapToggle} />
            <div id='clearButtons'>
                <button onClick={handleClearMap}>CLEAR MAP</button>
                <button onClick={handleClearBasemap}>CLEAR BASE</button>
            </div>
            <div><a id='title' href="https://github.com/damoncrockett/embeddingworld" target='_blank'>embedding world.</a></div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <textarea ref={inputRef} onKeyDown={handleKeyDown} style={{ marginRight: '10px' }} />
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}>
                    <button onClick={handleAdd} style={{ marginRight: '10px' }}>ADD</button>
                    <Radio
                        choice={mapLevel}
                        choices={['map', 'base']}
                        onSwitch={(mapLevel) => setMapLevel(mapLevel)}
                        id='mapLevel'
                    />
                </div>
                <button className={basemapLocked ? 'locked' : 'unlocked'} onClick={handleBasemapLock} style={{ marginRight: '10px' }}>FIT BASE</button>
                <select onChange={e => {setEmbeddingModel(e.target.value); setLoadingInset(true);}} value={embeddingModel} style={{ marginRight: '10px' }}>
                    {embeddingModels.map(model => (
                        <option key={model} value={model}>
                            {model}
                        </option>
                    ))}
                </select>
                <Radio
                    choice={reducer}
                    choices={['pca', 'umap']}
                    onSwitch={handleReducer}
                    id='reducer'
                />
            </div>
            {loadingInset && <LoadingInset />}
            <Map 
                mapData={mapData}
                setClickChange={setClickChange}
                isMeterHovered={isMeterHovered}
                maxPair={maxPair} 
            />
            <div id='meterContainer'>
                <div id='projectionMode' className={reducer === 'proj' ? 'projectionModeVisible' : 'projectionModeInvisible'} >PROJECTION MODE</div>
                <div id='spreadMeter'
                    onMouseEnter={() => setIsMeterHovered(true)}
                    onMouseLeave={() => setIsMeterHovered(false)}
                    onClick={handleProjectionMode}
                >
                    <Meter key={'spread' + meterModelSignal} initialValue={maxDistance} labelText="Max Distance" className="meter" />
                </div>
                <Meter key={'corr' + meterModelSignal} initialValue={spearmanCorrelation} labelText="Reduction Corr." className="meter" />
            </div>
        </div>
    );
    
}
