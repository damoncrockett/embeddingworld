import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function Selections({ 
    selections, 
    setSelections, 
    handleRemoveSelection,
    reducer 
}) {

    const reorderSelections = (list, startIndex, endIndex) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    const onDragEnd = result => {
        if (!result.destination) {
          return;
        }
        const newSelections = reorderSelections(
            selections,
            result.source.index,
            result.destination.index
        );
        setSelections(newSelections);
    };

    const selectionSlotStatus = (d, i, reducer, selections) => {

        if (d === null) return 'empty';
        if (reducer === 'pca')  return 'idle';
    
        if (reducer === 'nearest') {
            if (i === 0) return 'filled';
            if (i > 0) return 'idle';
        } else if (reducer === 'paths') {
            if (i === 0) {
                if (selections[1] === null) return 'lonely';
                if (selections[1] !== null) return 'filled';
            } else if (i === 1) {
                if (selections[0] === null) return 'lonely';
                if (selections[0] !== null) return 'filled';
            } else if (i > 1) {
                return 'idle';
            }
        } else if (reducer === 'project') {
            if (i === 0) {
                if (selections[1] === null) return 'lonely';
                if (selections[1] !== null) return 'filled';
            } else if (i === 1) {
                if (selections[0] === null) return 'lonely';
                if (selections[0] !== null) return 'filled';
            } else if (i === 2) {
                if (selections[3] === null) return 'lonely';
                if (selections[3] !== null) return 'filled';
            } else if (i === 3) {
                if (selections[2] === null) return 'lonely';
                if (selections[2] !== null) return 'filled';
            }
        }
    }
    
    return (
        <div id='selection-slots'>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="droppable">
                    {(provided, _) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                    >
                        {selections.map((item, index) => (
                        <Draggable key={`${item}${index}`} draggableId={`${item}${index}`} index={index}>
                            {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                className={`selection-slot ${selectionSlotStatus(item, index, reducer, selections)} ${snapshot.isDragging ? 'dragging' : ''}`}
                                onClick={handleRemoveSelection}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={provided.draggableProps.style}
                            >
                                {item ? item : 'LANDSCAPE'}
                            </div>
                            )}
                        </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    );
};