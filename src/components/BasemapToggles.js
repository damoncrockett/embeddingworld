// BasemapToggles.js
import React from 'react';

const BasemapToggles = ({ basemaps, onToggle }) => {
    const handleChange = (event) => {
        const { name, checked } = event.target;
        onToggle(name, checked);
    };

    return (
        <div className="basemap-toggle-container">
            {Object.keys(basemaps).map((basemapName) => (
                <label key={basemapName} className="basemap-toggle-label">
                    <input
                        type="checkbox"
                        name={basemapName}
                        className="basemap-toggle-checkbox"
                        onChange={handleChange}
                    />
                    {basemapName}
                </label>
            ))}
        </div>
    );
};


export default BasemapToggles;
