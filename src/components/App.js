import React, { useState, useRef, useEffect } from 'react';
import { embeddingModels, initializeEmbedder, getEmbeddings } from '../../utils/embed';
import { reduceEmbeddings } from '../../utils/reduce';
import { basemaps, sampleRandomWords } from '../../utils/text';
import Radio from './Radio';
import BasemapToggles from './BasemapToggles';
import Map from './Map';
import Loading from './Loading';
import LoadingInset from './LoadingInset';
import { computePairwiseDistances } from '../../utils/geometry';
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
    const [maxPair, setMaxPair] = useState(null); // [i, j] indices of the pair with max distance
    const [meterModelSignal, setMeterModelSignal] = useState(0);
    const [isMeterHovered, setIsMeterHovered] = useState(false);
    const [infoModal, setInfoModal] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selections, setSelections] = useState([null, null, null, null]);

    const inputRef = useRef(null);
    const embedderRef = useRef(null);
    const prevEmbeddingModel = useRef(embeddingModel);

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
        const maxDistanceAndPair = computePairwiseDistances(mapList.map(d => d.vec), distanceFunctionName);
        
        setMaxDistance(maxDistanceAndPair[0]);
        
        // safer than saving just the indices, because they change a lot
        const maxPairSamples = maxDistanceAndPair[1] ? [mapList[maxDistanceAndPair[1][0]].smp, mapList[maxDistanceAndPair[1][1]].smp] : null;
        setMaxPair(maxPairSamples);
        
        
        const maxPairCoords = maxDistanceAndPair[1] ? [mapList[maxDistanceAndPair[1][0]].vec, mapList[maxDistanceAndPair[1][1]].vec] : null;
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
                    isMeterHovered={isMeterHovered}
                    maxPair={maxPair}
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
                        choices={['pca', 'proj', 'nn', 'path']}
                        onSwitch={reducer => setReducer(reducer)}
                        id='choose-reducer'
                    />
                    <div id='select-group'>
                        <button id='select-mode' className={selectMode ? 'on' : 'off'} onClick={() => setSelectMode(prev => !prev)}>SELECT</button>
                        <div id='selection-slots'>
                            {selections.map((d, i) => (
                                <div key={i} className={d ? 'selection-slot' : 'selection-slot empty'}>{d ? d : 'LANDSCAPE'}</div>
                            ))}
                        </div>
                    </div>
                </div>
                <div id='spreadMeter' onMouseEnter={() => setIsMeterHovered(true)} onMouseLeave={() => setIsMeterHovered(false)}>
                    <Meter key={'spread' + meterModelSignal} initialValue={maxDistance} labelText="Max Distance" className="meter" />
                </div>
            </div>
            <div id='title-group'>
                <a id='title' href="https://github.com/damoncrockett/embeddingworld" target='_blank'>embedding world</a>
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
