import React, { useState, useRef, useEffect } from 'react';
import { select } from 'd3-selection';
import { plotSummaryCoords } from '../../utils/plot';
import basemap from '../../src/assets/json/basemap.json';
import { embeddingModels, initializeEmbedder } from '../../utils/embed';
import { reduceEmbeddings } from '../../utils/reduce';

let pca;

export default function App() {
    const [passage, setPassage] = useState('');
    const [samples, setSamples] = useState([]);
    const [embeddingModel, setEmbeddingModel] = useState(embeddingModels[0]);
    const [embeddings, setEmbeddings] = useState([]);
    const [sampleCoords, setSampleCoords] = useState([]);
    const [basemapExists, setBasemapExists] = useState(false);
    const [basemapLocked, setBasemapLocked] = useState(false);    
    const inputRef = useRef();
    const svgRef = useRef();
    const embedderRef = useRef(null);
    const [version, setVersion] = useState(0);

    function handleModelChange(event) {
        setEmbeddingModel(event.target.value);
    }

    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            handleButtonClick(); // Call the function to handle submission
        }
    }

    const handleButtonClick = () => {
        setPassage(inputRef.current.value);
        inputRef.current.value = ''; // Clear the input field
    };

    const handleLockBasemap = () => {
        setBasemapLocked(!basemapLocked);
    }

    useEffect(() => {
        initializeEmbedder(embeddingModel, embedderRef, setVersion);
    }, [embeddingModel]);

    useEffect(() => {
        async function processBasemapOnMount() {
            if (basemap.length === 0 || !embedderRef.current) return; // Now also checks if embedder is loaded

            const svgWidth = svgRef.current.clientWidth;
            const svgHeight = svgRef.current.clientHeight;

            const { model, screenCoords } = await reduceEmbeddings(basemap, svgWidth, svgHeight, embedderRef, setEmbeddings);
            pca = model;

            setSamples(basemap);
            setSampleCoords(screenCoords);
            setBasemapExists(true);
        }

        processBasemapOnMount();
    }, [version]);

    useEffect(() => {
        async function processInput() {
            if (!passage || !embedderRef.current) return; // Exit early if there's no passage to process

            const svgWidth = svgRef.current.clientWidth;
            const svgHeight = svgRef.current.clientHeight;

            let screenCoords;
            if ( basemapLocked ) {
                ({ screenCoords } = await reduceEmbeddings([passage], svgWidth, svgHeight, embedderRef, setEmbeddings, embeddings, pca));
            } else {
                ({ screenCoords } = await reduceEmbeddings([passage], svgWidth, svgHeight, embedderRef, setEmbeddings, embeddings));
            }
            
            setSamples(prevSamples => [...prevSamples, passage]);
            setSampleCoords(screenCoords); 
        }
    
        processInput();
    }, [passage]);

    useEffect(() => {
        if (sampleCoords.length === 0) return;
    
        const svg = select(svgRef.current);

        if ( basemapExists ) {
            plotSummaryCoords(samples, sampleCoords, svg, { start: 0, end: 10 });
        } else {
            plotSummaryCoords(samples, sampleCoords, svg);
        }

    }, [sampleCoords, version]);
    
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <div style={{ marginBottom: '10px' }}> {/* Ensure this div doesn't grow and only takes necessary space */}
                <input ref={inputRef} onKeyDown={handleKeyDown} />
                <button onClick={handleButtonClick}>MAP</button>
                <button className={basemapLocked ? 'locked' : 'unlocked'} onClick={handleLockBasemap}>LOCK BASEMAP</button>
                <select onChange={handleModelChange} value={embeddingModel}>
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
