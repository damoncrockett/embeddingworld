import React, { useState, useRef, useEffect } from 'react';
// import { select } from 'd3-selection';
// import { plotCoords } from '../../utils/plot';
import { embeddingModels, initializeEmbedder, getEmbeddings } from '../../utils/embed';
// import { reduceEmbeddings } from '../../utils/reduce';
import { basemaps } from '../../utils/text';
import Radio from './Radio';
import BasemapToggles from './BasemapToggles';

export default function App() {

    const [mapLevel, setMapLevel] = useState('map'); // Tracks the current mode (map or basemap)
    const [mapList, setMapList] = useState([]); // Stores inputs for maps
    const [basemapList, setBasemapList] = useState([]); // Stores inputs for basemaps
    const [basemapLocked, setBasemapLocked] = useState(false); // Tracks whether the basemap is locked
    const [embeddingModel, setEmbeddingModel] = useState(embeddingModels[0]);
    const [embedderChangeCounter, setEmbedderChangeCounter] = useState(0);
    const [basemapCoords, setBasemapCoords] = useState([]);

    const inputRef = useRef(null);
    const svgRef = useRef();
    const embedderRef = useRef(null);

    const handleBasemapToggle = async (name, isChecked) => {
        // Extract the current list first to avoid directly using async operations inside setBasemapList
        let currentList = [...basemapList];
        const itemsToAddOrRemove = basemaps[name]; // Assuming this is an array of strings
    
        if (isChecked) {
            // Identify new items not already in the list
            const newItems = itemsToAddOrRemove.filter(item => !currentList.some(e => e.sample === item));
            if (newItems.length > 0) {
                const newEmbeddings = await getEmbeddings(newItems, embedderRef);
                const newItemsWithEmbeddings = newItems.map((item, index) => ({
                    sample: item,
                    embedding: newEmbeddings[index],
                }));
                // Update the list with new items
                setBasemapList(currentList.concat(newItemsWithEmbeddings));
            }
        } else {
            // For unchecked, filter out the items related to this basemap
            const filteredList = currentList.filter(item => !itemsToAddOrRemove.includes(item.sample));
            setBasemapList(filteredList);
        }
    };
        
    const handleAdd = async () => {
        const inputValues = inputRef.current.value.split('\n')
            .map(item => item.trim())
            .filter(item => item && !mapList.some(e => e.sample === item) && !basemapList.some(e => e.sample === item)); // Unique, non-empty items not already in lists
    
        if (inputValues.length > 0) {
            // Fetch embeddings for the new input values
            const newEmbeddings = await getEmbeddings(inputValues, embedderRef);
            // Create new items with their embeddings
            const newItemsWithEmbeddings = inputValues.map((item, index) => ({
                sample: item,
                embedding: newEmbeddings[index],
            }));
    
            // Decide which list to update based on the current map level
            if (mapLevel === 'map') {
                setMapList(prevList => [...prevList, ...newItemsWithEmbeddings]);
            } else if (mapLevel === 'basemap') {
                setBasemapList(prevList => [...prevList, ...newItemsWithEmbeddings]);
            }
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
        const reFetchAllEmbeddings = async () => {
            // Helper function to extract samples, fetch new embeddings, and update items with new embeddings
            async function fetchEmbeddingsForItems(items) {
                const samples = items.map(item => item.sample);
                const newEmbeddings = await getEmbeddings(samples, embedderRef);
                // Now we correctly associate each new embedding with its corresponding item
                return samples.map((sample, index) => ({
                    sample: sample,
                    embedding: newEmbeddings[index],
                }));
            }
    
            // Re-fetch embeddings for all items in mapList and basemapList
            const mapItems = await fetchEmbeddingsForItems(mapList);
            const basemapItems = await fetchEmbeddingsForItems(basemapList);
    
            setMapList(mapItems); // Corrected to reflect the change in variable names
            setBasemapList(basemapItems); // Corrected to reflect the change in variable names
        };
    
        reFetchAllEmbeddings();
    }, [embedderChangeCounter]); // Depend on embedderChangeCounter to trigger re-fetching
    

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
            </div>
            <svg ref={svgRef} style={{ flexGrow: 1 }} width="100%" height="100%"></svg>
        </div>
    );
    
}

