import React from 'react';

// Renders a component passed by reference (e.g. a react-icons icon) — keeps data arrays declarative.
const Ico = ({ as, ...rest }) => (as ? React.createElement(as, rest) : null);

export default Ico;
