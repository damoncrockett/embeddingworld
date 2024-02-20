import React from 'react';

export default function Radio({ choice, onSwitch, id }) {
    const mapId = `${id}-map`;
    const baseId = `${id}-basemap`;

    // Assigning unique IDs for labels as well, to target with CSS
    const labelMapId = `label-${mapId}`;
    const labelBaseId = `label-${baseId}`;

    return (
      <div className="radio-switch" id={id} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <input
          type="radio"
          id={mapId}
          value="map"
          checked={choice === 'map'}
          onChange={() => onSwitch('map')}
          style={{ display: 'none' }}
        />
        <label htmlFor={mapId} id={labelMapId} style={{ padding: '10px' }}>MAP</label>

        <input
          type="radio"
          id={baseId}
          value="basemap"
          checked={choice === 'basemap'}
          onChange={() => onSwitch('basemap')}
          style={{ display: 'none' }}
        />
        <label htmlFor={baseId} id={labelBaseId} style={{ padding: '10px' }}>BASE</label>
      </div>
    );
}

