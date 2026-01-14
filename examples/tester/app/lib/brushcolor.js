// color of each dataset within a chart

const getBrushColor = (index, val) => {

    const colorList = ['MediumBlue', 'DodgerBlue',  'maroon', 'crimson', 'lime', 'lavender', 'dodgerblue', 'teal', 'CadetBlue', 'gray'];
    
    return colorList[index];

};

export {getBrushColor};
