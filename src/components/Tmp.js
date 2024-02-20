export default function App() {
    
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
    
    
}
