import React, { useState, useRef, useEffect } from 'react';
import { embeddingModels, initializeEmbedder, getEmbeddings } from '../../utils/embed';
import { reduceEmbeddings } from '../../utils/reduce';
import { basemaps } from '../../utils/text';
import Radio from './Radio';
import BasemapToggles from './BasemapToggles';
import Map from './Map';
import isEqual from 'lodash/isEqual';

export default function App() {

    const [mapLevel, setMapLevel] = useState('map'); 
    const [mapList, setMapList] = useState([]);
    const [mapData, setMapData] = useState(null);
    const [clickChange, setClickChange] = useState(null);
    const [basemapLocked, setBasemapLocked] = useState(false); 
    const [embeddingModel, setEmbeddingModel] = useState(embeddingModels[0]);
    const [reducer, setReducer] = useState('pca');
    const [embedderChangeCounter, setEmbedderChangeCounter] = useState(0);

    const inputRef = useRef(null);
    const embedderRef = useRef(null);
    const prevMapList = useRef(mapList);
    const prevEmbeddingModel = useRef(embeddingModel);
    const prevCoords = useRef(null);
    const prevReducer = useRef(reducer);

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
                console.log('basemap toggle checked', currentList.concat(newItemsWithEmbeddings));
            }
        } else {
            const filteredList = currentList.filter(item => !itemsToAddOrRemove.includes(item.smp));
            setMapList(filteredList);
            console.log('basemap toggle unchecked', filteredList);
        }
    };

    const handleClearMap = () => {
        setMapList(prevList => prevList.filter(item => item.lvl === 'b'));
        console.log('clear map', mapList.filter(item => item.lvl === 'b'));
    }

    const handleClearBasemap = () => {
        setMapList(prevList => prevList.filter(item => item.lvl === 'm'));
        console.log('clear basemap', mapList.filter(item => item.lvl === 'm'));

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
        console.log('basemap' + (basemapLocked ? ' unlocked' : ' locked'));
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
            console.log('add', [...mapList, ...newItemsWithEmbeddings]);
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
        initializeEmbedder(embeddingModel, embedderRef, setEmbedderChangeCounter);
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
            console.log('recomputed embeddings', updatedMapList);
        };
    
        recomputeEmbeddings();
    }, [embedderChangeCounter]);

    const handleReducer = (reducer) => {

        if ( reducer === 'umap' && mapList.length < 15 ) {
            alert('In this world, UMAP requires at least 15 samples.');
            return;
        }

        setReducer(reducer);
        console.log('reducer', reducer);
    }
    
    useEffect(() => {

        if ( !mapList.some(item => item.lvl === 'b') && basemapLocked ) {
            console.log('The basemap is locked but there is nothing on it. Unlocking.')
            setBasemapLocked(false);
            console.log('basemap unlocked');
            return; // must return bc setBasemapLocked won't fire fast enough to prevent plotting error
        }

        // If all we've done is switch an item between the map and basemap, we don't recompute coords.
        // This wouldn't matter except that UMAP is non-deterministic and we don't want it to relocate items 
        // if nothing substantive has changed.
        const skipReduce = isEqual(prevMapList.current.map(d => d.smp), mapList.map(d => d.smp)) && 
                              prevEmbeddingModel.current === embeddingModel &&
                              prevReducer.current === reducer &&
                              reducer === 'umap';

        console.log('skipReduce:', skipReduce);

        let coords;
        if ( skipReduce ) {
            coords = prevCoords.current;
        } else {
            coords = reduceEmbeddings(mapList, basemapLocked, reducer);
        }

        prevMapList.current = mapList;
        prevEmbeddingModel.current = embeddingModel;
        prevCoords.current = coords;
        prevReducer.current = reducer;
                        
        const mapListAndCoords = mapList.map((item, index) => ({
            ...item,
            x: coords[index][0],
            y: coords[index][1]
        }));
        
        setMapData(mapListAndCoords);
        console.log('new mapListAndCoords created', mapListAndCoords);
    
    } , [mapList, basemapLocked, reducer]);

    useEffect(() => {
        if ( clickChange && clickChange.changeType === 'switch' ) {
            const currentList = [...mapList];
            const index = currentList.findIndex(item => item.smp === clickChange.smp);
            currentList[index].lvl = currentList[index].lvl === 'm' ? 'b' : 'm';
            setMapList(currentList);
            console.log('switched level', currentList);
        } else if ( clickChange && clickChange.changeType === 'remove' ) {
            const currentList = [...mapList];
            const index = currentList.findIndex(item => item.smp === clickChange.smp);
            currentList.splice(index, 1);
            setMapList(currentList);
            console.log('removed ' + clickChange.smp, currentList);
        }
    }, [clickChange]);
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
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
                        choices={['map', 'basemap']}
                        onSwitch={(mapLevel) => setMapLevel(mapLevel)}
                        id='mapLevel'
                    />
                </div>
                <button className={basemapLocked ? 'locked' : 'unlocked'} onClick={handleBasemapLock} style={{ marginRight: '10px' }}>LOCK</button>
                <select onChange={e => setEmbeddingModel(e.target.value)} value={embeddingModel} style={{ marginRight: '10px' }}>
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
            <Map 
                mapData={mapData}
                setClickChange={setClickChange} 
            />
        </div>
    );
    
}

