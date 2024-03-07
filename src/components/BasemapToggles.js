import React, { useState } from 'react';

const BasemapToggles = ({ basemaps, onToggle }) => {
    const [isOpen, setIsOpen] = useState(false); 

    const handleChange = (event) => {
        const { name, checked } = event.target;
        onToggle(name, checked);
    };

    const toggleModal = () => {
        setIsOpen(!isOpen);
    };

    return (
        <>
            <div id="basemap-toggle-container" className={isOpen ? 'open' : ''}>
                {Object.keys(basemaps).map((basemapName) => (
                    <label key={basemapName} className="basemap-toggle-label">
                        <input
                            type="checkbox"
                            name={basemapName}
                            className="basemap-toggle-checkbox"
                            onChange={handleChange}
                        />
                        {basemapName.toUpperCase()}
                    </label>
                ))}
                <div title='pre-made basemaps' className={`toggle-button material-icons ${isOpen ? 'open' : ''}`} onClick={toggleModal}>double_arrow</div>
            </div>
        </>
    );
};

export default BasemapToggles;
