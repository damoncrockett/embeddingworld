import React, { useState, useRef, useEffect } from 'react';
import { select } from 'd3-selection';
import { plotCoords } from '../../utils/plot';
import { embeddingModels, initializeEmbedder, getEmbeddings } from '../../utils/embed';
import { reduceEmbeddings } from '../../utils/reduce';
import { basemaps } from '../../utils/text';
import Radio from './Radio';
import BasemapToggles from './BasemapToggles';

export default function App() {

    const [mapLevel, setMapLevel] = useState('map'); // Tracks the current mode (map or basemap)
    const [mapList, setMapList] = useState([]); // Stores inputs for maps
    const [basemapLocked, setBasemapLocked] = useState(false); // Tracks whether the basemap is locked
    const [embeddingModel, setEmbeddingModel] = useState(embeddingModels[0]);
    const [reducer, setReducer] = useState('pca');
    const [embedderChangeCounter, setEmbedderChangeCounter] = useState(0);

    const inputRef = useRef(null);
    const svgRef = useRef();
    const embedderRef = useRef(null);

    const handleBasemapToggle = async (name, isChecked) => {
        // Extract the current list first to avoid directly using async operations inside setBasemapList
        let currentList = [...mapList];
        const itemsToAddOrRemove = basemaps[name]; // Assuming this is an array of strings
    
        if (isChecked) {
            // Identify new items not already in the list
            const newItems = itemsToAddOrRemove.filter(item => !currentList.some(e => e.smp === item));
            if (newItems.length > 0) {
                const newEmbeddings = await getEmbeddings(newItems, embedderRef);
                const newItemsWithEmbeddings = newItems.map((item, index) => ({
                    smp: item,
                    vec: newEmbeddings[index],
                    lvl: 'b'
                }));
                // Update the list with new items
                setMapList(currentList.concat(newItemsWithEmbeddings));
            }
        } else {
            // For unchecked, filter out the items related to this basemap
            const filteredList = currentList.filter(item => !itemsToAddOrRemove.includes(item.smp));
            setMapList(filteredList);
        }
    };
        
    const handleAdd = async () => {
        const inputValues = inputRef.current.value.split('\n')
            .map(item => item.trim())
            .filter(item => item && !mapList.some(e => e.smp === item)); // Avoid duplicates
        if (inputValues.length > 0) {
            // Fetch embeddings for the new input values
            const newEmbeddings = await getEmbeddings(inputValues, embedderRef);
            // Create new items with their embeddings
            const newItemsWithEmbeddings = inputValues.map((item, index) => ({
                smp: item,
                vec: newEmbeddings[index],
                lvl: mapLevel === 'map' ? 'm' : 'b'
            }));
            setMapList(prevList => [...prevList, ...newItemsWithEmbeddings]);
        }
    
        inputRef.current.value = ''; // Clear the input field
    };
    
    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            handleAdd(); // Call the function to handle submission
        }
    }

    const handleLockBasemap = () => {
        setBasemapLocked(!basemapLocked);
    }

    function handleModelChange(event) {
        setEmbeddingModel(event.target.value);
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
        };
    
        recomputeEmbeddings();
    }, [embedderChangeCounter]);
    

    useEffect(() => {
    
        const svgWidth = svgRef.current.clientWidth;
        const svgHeight = svgRef.current.clientHeight;
        const svg = select(svgRef.current);   
        const screenCoords = reduceEmbeddings(mapList, svgWidth, svgHeight, basemapLocked, reducer);

        const combinedData = mapList.map((item, index) => ({
            ...item,
            ...screenCoords[index],
        }));
        
        plotCoords(svg, combinedData);
        console.log('plotting');
    
    } , [mapList, basemapLocked, reducer]);
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <BasemapToggles basemaps={basemaps} onToggle={handleBasemapToggle} />
            <div><a id='title' href="https://github.com/damoncrockett/embeddingworld" target='_blank'>embedding world.</a></div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <textarea ref={inputRef} onKeyDown={handleKeyDown} style={{ marginRight: '10px' }} />
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}> {/* Adjust this div to align items */}
                    <button onClick={handleAdd} style={{ marginRight: '10px' }}>ADD</button>
                    <Radio
                        choice={mapLevel}
                        choices={['map', 'basemap']}
                        onSwitch={(mapLevel) => setMapLevel(mapLevel)}
                        id='mapLevel'
                    />
                </div>
                <button className={basemapLocked ? 'locked' : 'unlocked'} onClick={handleLockBasemap} style={{ marginRight: '10px' }}>LOCK</button>
                <select onChange={handleModelChange} value={embeddingModel} style={{ marginRight: '10px' }}>
                    {embeddingModels.map(model => (
                        <option key={model} value={model}>
                            {model}
                        </option>
                    ))}
                </select>
                <Radio
                    choice={reducer}
                    choices={['pca', 'umap']}
                    onSwitch={(reducer) => setReducer(reducer)}
                    id='reducer'
                />
            </div>
            <svg ref={svgRef} style={{ flexGrow: 1 }} width="100%" height="100%"></svg>
        </div>
    );
    
}

