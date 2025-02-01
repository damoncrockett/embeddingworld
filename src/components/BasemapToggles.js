import React, { useState, useRef, useEffect } from "react";

const CustomToggle = ({ name, onToggle }) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (isLoading) return;

    // Show spinner
    setIsLoading(true);

    // Defer the heavy computation until after the spinner has rendered
    setTimeout(async () => {
      try {
        // Perform your heavy asynchronous logic here
        await onToggle(name, !isChecked);

        // Update the checked state after the work completes
        setIsChecked(!isChecked);
      } finally {
        // Hide the spinner when done
        setIsLoading(false);
      }
    }, 0);
  };

  return (
    <div
      className={`custom-toggle ${isChecked ? "checked" : ""} ${isLoading ? "loading" : ""}`}
      onClick={handleClick}
    >
      {isLoading ? (
        <div className="spinner-container">
          <span
            className="material-icons spinner"
            style={{ color: "coral", display: "block" }}
          >
            refresh
          </span>
        </div>
      ) : (
        <span className="material-icons">
          {isChecked ? "check_box" : "check_box_outline_blank"}
        </span>
      )}
    </div>
  );
};

const BasemapToggles = ({ basemaps, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div id="basemap-toggle-container" className={isOpen ? "open" : ""}>
      {Object.keys(basemaps).map((basemapName) => (
        <label key={basemapName} className="basemap-toggle-label">
          <CustomToggle name={basemapName} onToggle={onToggle} />
          {basemapName.toUpperCase()}
        </label>
      ))}
      <div
        title="pre-made basemaps"
        className={`toggle-button material-icons ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        double_arrow
      </div>
    </div>
  );
};

export default BasemapToggles;
