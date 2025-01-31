import React, { useState } from 'react';
import { embeddingModels } from '../../utils/embed';

export default function ModelSelect({ 
  embeddingModel, 
  setEmbeddingModel, 
  setLoadingInset 
}) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  // Track custom models added during this session
  const [customModels, setCustomModels] = useState([]);

  const handleModelChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') {
      setShowCustomInput(true);
    } else {
      setEmbeddingModel(value);
      setLoadingInset(true);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const trimmedInput = customInput.trim();
    if (trimmedInput) {
      // Only add to custom models if it's not already in either list
      if (!embeddingModels.includes(trimmedInput) && !customModels.includes(trimmedInput)) {
        setCustomModels(prev => [...prev, trimmedInput]);
      }
      setEmbeddingModel(trimmedInput);
      setLoadingInset(true);
      setShowCustomInput(false);
      setCustomInput('');
    }
  };

  // Combine built-in and custom models for the dropdown
  const allModels = [...embeddingModels, ...customModels];

  return (
    <>
      <select 
        id='model-menu' 
        onChange={handleModelChange} 
        value={allModels.includes(embeddingModel) ? embeddingModel : 'custom'}
      >
        <optgroup label="Built-in Models">
          {embeddingModels.map(model => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </optgroup>
        
        {customModels.length > 0 && (
          <optgroup label="Custom Models">
            {customModels.map(model => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </optgroup>
        )}

        <optgroup label="Add New">
          <option value="custom">Custom...</option>
        </optgroup>
      </select>

      {showCustomInput && (
        <div className="modal-backdrop" onClick={() => setShowCustomInput(false)}>
          <div className="custom-model-modal" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCustomSubmit}>
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="Enter model path (e.g., organization/model-name)"
                autoFocus
              />
              <div className="modal-buttons">
                <button type="submit">Add Model</button>
                <button type="button" onClick={() => setShowCustomInput(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
