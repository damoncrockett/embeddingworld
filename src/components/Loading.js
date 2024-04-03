import React from 'react';

export default function Loading() {
    return (
        <div className='loading-overlay opaque'>
            <div id='loadingContainer'>
                <div id="loading">
                    <h2>Loading...</h2>
                </div>
            </div>
        </div>
    );
}