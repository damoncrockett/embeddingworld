import React from 'react';

export default function Radio({ choice, choices, onSwitch, id }) {
    
    const inputIds = choices.map(choice => `${id}-${choice}`);
    const labelIds = inputIds.map(inputId => `label-${inputId}`);

    return (
        <div className="radio-switch" id={id}>
            {choices.map((choiceValue, index) => (
                <React.Fragment key={choiceValue}>
                    <input
                        id={inputIds[index]}
                        type="radio"
                        value={choiceValue}
                        checked={choice === choiceValue}
                        onChange={() => onSwitch(choiceValue)}
                    />
                    <label
                        htmlFor={inputIds[index]}
                        id={labelIds[index]}
                        className={choice === choiceValue ? 'radioactive' : ''}
                    >
                        {choiceValue.toUpperCase()}
                    </label>
                </React.Fragment>
            ))}
        </div>
    );
}


