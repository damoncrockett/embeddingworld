import React, { useState, useRef, useEffect } from 'react';
import { embeddingModels, initializeEmbedder, getEmbeddings } from '../../utils/embed';
import { reduceEmbeddings } from '../../utils/reduce';
import { basemaps, sampleRandomWords } from '../../utils/text';
import Radio from './Radio';
import BasemapToggles from './BasemapToggles';
import Map from './Map';
import Loading from './Loading';
import LoadingInset from './LoadingInset';
import { getMaxPairwiseDistance, findBiggestOutlier } from '../../utils/geometry';
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
        
        // move nulls to the end
        const nonNullSelections = newSelections.filter(item => item !== null);
        const nullCount = newSelections.length - nonNullSelections.length;
        
        newSelections = [...nonNullSelections, ...Array(nullCount).fill(null)];
        
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
        
        const maxPairCoords = pair ? [mapList[pair[0]].vec, mapList[pair[1]].vec] : null;
        const coords = reduceEmbeddings(mapList, basemapLocked, reducer, maxPairCoords);

        if ( prevEmbeddingModel.current !== embeddingModel ) setMeterModelSignal(prev => prev + 1);

        prevEmbeddingModel.current = embeddingModel;
                        
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
        <div>
            <Map 
                    mapData={mapData}
                    setClickChange={setClickChange}
                    isSpreadMeterHovered={isSpreadMeterHovered}
                    isOutlierMeterHovered={isOutlierMeterHovered}
                    maxPair={maxPair}
                    maxZscoreSample={maxZscoreSample}
                    selectMode={selectMode}
                    selections={selections}
                    setSelections={setSelections} 
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
                        choices={['pca', 'project', 'nearest', 'paths']}
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
                        <div id='selection-slots'>
                            {selections.map((d, i) => (
                                <div key={i} title={d ? d : '[empty]'} onClick={handleRemoveSelection} className={d ? 'selection-slot filled' : 'selection-slot empty'}>{d ? d : 'LANDSCAPE'}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div id='info-group'>
                <a href="https://github.com/damoncrockett/embeddingworld" target='_blank'>
                    <svg id='github-icon' viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"></path>
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
