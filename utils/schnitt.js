{selections.map((d, i) => (
    <div key={i} title={d ? d : '[empty]'} onClick={handleRemoveSelection} className={`selection-slot ${selectionSlotStatus(d, i, reducer, selections)}`}>{d ? d : 'LANDSCAPE'}</div>
))}