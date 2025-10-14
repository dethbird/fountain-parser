const re = /^(?:(title|credit|author|authors|writer|writers|written\s+by|screenplay\s+by|teleplay\s+by|story\s+by|adaptation\s+by|source|based\s+on(?:\s+characters\s+by)?|notes|draft(?:\s+date)?|revision(?:\s+date|(?:\s+)?color)?|draft\s*#|date|contact|copyright|wga(?:\s+registration)?|registration(?:\s*#)?|series|episode(?:\s+title)?|showrunner|production(?:\s+company)?)\s*):\s*/i;

console.log('written by: Danny'.match(re));
console.log('writer: Rishi'.match(re));
console.log('author: Name'.match(re));
console.log('screenplay by: Janice'.match(re));
console.log('not a title: someone'.match(re));
