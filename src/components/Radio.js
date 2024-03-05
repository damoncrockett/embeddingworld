import React from 'react';

export default function Radio({ choice, choices, onSwitch, id }) {
    const choice0id = `${id}-${choices[0]}`;
    const choice1id = `${id}-${choices[1]}`;

    const labelChoice0id = `label-${choice0id}`;
    const labelChoice1id = `label-${choice1id}`;

    return (
      <div className="radio-switch" id={id}>
        <input
          type="radio"
          value={choices[0]}
          checked={choice === choices[0]}
          onChange={() => onSwitch(choices[0])}
        />
        <label htmlFor={choice0id} id={labelChoice0id}>{choices[0].toUpperCase()}</label>

        <input
          type="radio"
          value={choices[1]}
          checked={choice === choices[1]}
          onChange={() => onSwitch(choices[1])}
        />
        <label htmlFor={choice1id} id={labelChoice1id}>{choices[1].toUpperCase()}</label>
      </div>
    );
}

