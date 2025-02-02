import React, {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

const CustomToggle = forwardRef(({ name, onToggle }, ref) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (isLoading) return;
    setIsLoading(true);
    setTimeout(async () => {
      try {
        await onToggle(name, !isChecked);
        setIsChecked(!isChecked);
      } finally {
        setIsLoading(false);
      }
    }, 0);
  };

  useImperativeHandle(ref, () => ({
    reset: () => setIsChecked(false),
  }));

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
});

CustomToggle.displayName = "CustomToggle";

const BasemapToggles = forwardRef(({ basemaps, onToggle }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRefs = useRef({});

  useImperativeHandle(ref, () => ({
    resetAll: () => {
      Object.values(toggleRefs.current).forEach((toggleRef) => {
        toggleRef.current?.reset();
      });
    },
  }));

  return (
    <div id="basemap-toggle-container" className={isOpen ? "open" : ""}>
      {Object.keys(basemaps).map((basemapName) => {
        toggleRefs.current[basemapName] = useRef();
        return (
          <label key={basemapName} className="basemap-toggle-label">
            <CustomToggle
              ref={toggleRefs.current[basemapName]}
              name={basemapName}
              onToggle={onToggle}
            />
            {basemapName.toUpperCase()}
          </label>
        );
      })}
      <div
        title="pre-made basemaps"
        className={`toggle-button material-icons ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        double_arrow
      </div>
    </div>
  );
});

BasemapToggles.displayName = "BasemapToggles";

export default BasemapToggles;
