import React, { useState, useRef, useEffect } from 'react';
import { embeddingModels, initializeEmbedder, getEmbeddings } from '../../utils/embed';
import { reduceEmbeddings } from '../../utils/reduce';
import { basemaps } from '../../utils/text';
import Radio from './Radio';
import BasemapToggles from './BasemapToggles';
import Map from './Map';
import Loading from './Loading';
import { calculateSphere, computeAndRankPairwiseDistances, spearmanRankCorrelation } from '../../utils/geometry';
import SpreadMonitor from './SpreadMonitor';
import Spearman from './Spearman';

export default function App() {

    const [loading, setLoading] = useState(true);
    const [mapLevel, setMapLevel] = useState('map'); 
    const [mapList, setMapList] = useState([]);
    const [mapData, setMapData] = useState(null);
    const [clickChange, setClickChange] = useState(null);
    const [basemapLocked, setBasemapLocked] = useState(false); 
    const [embeddingModel, setEmbeddingModel] = useState(embeddingModels[0]);
    const [embedderChangeCounter, setEmbedderChangeCounter] = useState(0);
    const [sphereRadius, setSphereRadius] = useState(0);
    const [spearmanCorrelation, setSpearmanCorrelation] = useState(0);

    const inputRef = useRef(null);
    const embedderRef = useRef(null);

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
        initializeEmbedder(
            embeddingModel, 
            embedderRef, 
            setEmbedderChangeCounter,
            setLoading);
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
    
    useEffect(() => {

        if ( !mapList.some(item => item.lvl === 'b') && basemapLocked ) {
            alert('You are fitting the basemap, but there is nothing on it. Exiting "FIT BASE" mode.')
            setBasemapLocked(false);
            console.log('basemap unlocked');
            return; // must return bc setBasemapLocked won't fire fast enough to prevent plotting error
        }

        // get radius of bounding sphere
        if ( mapList.length > 0 ) {
            const sphere = calculateSphere(mapList.map(d => d.vec));
            setSphereRadius(sphere.radius);
        } else {
            setSphereRadius(0);
        }

        const coords = reduceEmbeddings(mapList, basemapLocked);

        // get Spearman correlation between pairwise distances in original space and in reduced space
        
        if ( mapList.length > 1 ) {

            const originalRanks = computeAndRankPairwiseDistances(mapList.map(d => d.vec));
            const reducedRanks = computeAndRankPairwiseDistances(coords);
            console.log(originalRanks, reducedRanks)
            const corr = spearmanRankCorrelation(originalRanks, reducedRanks);
            console.log('spearman correlation', corr);
            setSpearmanCorrelation(corr);

        } else {
            setSpearmanCorrelation(0);
        }
         
        const mapListAndCoords = mapList.map((item, index) => ({
            ...item,
            x: coords[index][0],
            y: coords[index][1]
        }));
        
        setMapData(mapListAndCoords);
        console.log('new mapListAndCoords created', mapListAndCoords);
    
    } , [mapList, basemapLocked]);

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
        loading ? <Loading /> :
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
                <button className={basemapLocked ? 'locked' : 'unlocked'} onClick={handleBasemapLock} style={{ marginRight: '10px' }}>FIT BASE</button>
                <select onChange={e => setEmbeddingModel(e.target.value)} value={embeddingModel} style={{ marginRight: '10px' }}>
                    {embeddingModels.map(model => (
                        <option key={model} value={model}>
                            {model}
                        </option>
                    ))}
                </select>
            </div>
            <Map 
                mapData={mapData}
                setClickChange={setClickChange} 
            />
            <div id='meterContainer'>
                <SpreadMonitor 
                    radius={sphereRadius} 
                />
                <Spearman 
                    correlation={spearmanCorrelation}
                />
            </div>
        </div>
    );
    
}

