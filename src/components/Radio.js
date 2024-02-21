import React from 'react';

export default function Radio({ choice, choices, onSwitch, id }) {
    const choice0id = `${id}-${choices[0]}`;
    const choice1id = `${id}-${choices[1]}`;

    // Assigning unique IDs for labels as well, to target with CSS
    const labelChoice0id = `label-${choice0id}`;
    const labelChoice1id = `label-${choice1id}`;

    return (
      <div className="radio-switch" id={id} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <input
          type="radio"
          id={choice0id}
          value={choices[0]}
          checked={choice === choices[0]}
          onChange={() => onSwitch(choices[0])}
          style={{ display: 'none' }}
        />
        <label htmlFor={choice0id} id={labelChoice0id} style={{ padding: '10px' }}>{choices[0].toUpperCase()}</label>

        <input
          type="radio"
          id={choice1id}
          value={choices[1]}
          checked={choice === choices[1]}
          onChange={() => onSwitch(choices[1])}
          style={{ display: 'none' }}
        />
        <label htmlFor={choice1id} id={labelChoice1id} style={{ padding: '10px' }}>{choices[1].toUpperCase()}</label>
      </div>
    );
}

