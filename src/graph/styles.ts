import type cytoscape from 'cytoscape';

export const graphStyles: Array<cytoscape.StylesheetStyle | cytoscape.StylesheetCSS> = [
  {
    selector: 'node',
    style: {
      'background-color': '#eceae4',
      'border-color': 'data(branchColor)',
      'border-width': '5px',
      'width': 'data(width)',
      'height': 'data(height)',
      label: 'data(label)',
      color: '#0f172a',
      'font-size': '12px',
      'font-weight': 600,
      'text-wrap': 'wrap',
      'text-max-width': '96px',
      'text-valign': 'center',
      'text-halign': 'center',
      padding: '8px',
      shape: 'round-rectangle',
    },
  },
  {
    selector: 'node[system = "borough"]',
    style: {
      'border-color': '#ea580c',
      'border-width': '5px',
    },
  },
  {
    selector: 'node[system = "charter"]',
    style: {
      color: '#0f172a',
    },
  },
  {
    selector: 'node[system = "charter"][!branchColor]',
    style: {
      'background-color': '#e2e8f0',
    },
  },
  {
    selector: 'edge',
    style: {
      // TEMPORARY: Testing haystack routing (change back to 'bezier' if not preferred)
      'curve-style': 'haystack',
      'haystack-radius': 0,
      width: '2px',
      'line-color': '#334155',
      'line-opacity': 0.9,
      'target-arrow-color': '#334155',
      'target-arrow-shape': 'triangle',
      'target-arrow-fill': 'filled',
      opacity: 0.9,
      'arrow-scale': 1.1,
      label: 'data(label)',
      'font-size': '10px',
      color: '#334155',
      'text-background-color': '#f8fafc',
      'text-background-opacity': 0.9,
      'text-background-padding': '2px',
      'text-rotation': 'autorotate',
    },
  },
{
  selector: 'node[type = "anchor"]',
  style: {
    display: 'none',
  },
},
{
  selector: 'edge[?isAnchorEdge]',
  style: {
    display: 'none',
  },
},
  {
    selector: 'edge[label = ""]',
    style: {
      'text-opacity': 0,
    },
  },
  {
    selector: '.dimmed',
    style: {
      opacity: 0.18,
      'text-opacity': 0.18,
    },
  },
  {
    selector: 'edge.dimmed',
    style: {
      'line-color': '#cbd5f5',
      'target-arrow-color': '#cbd5f5',
      opacity: 0.18,
    },
  },
  {
    selector: '.process-active',
    style: {
      'background-color': 'data(branchColor)',
      'border-color': '#2563eb',
      'border-width': '3px',
      color:'white'
    },
  },
  {
    selector: '.process-active-edge',
    style: {
      'line-color': '#2563eb',
      'target-arrow-color': '#2563eb',
      width: '3px',
      opacity: 0.95,
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-color': '#0f172a',
      'border-width': '3px',
      'background-color': 'data(branchColor)',
      color:'white'
    },
  },
  {
    selector: '.faded',
    style: {
      opacity: 0.12,
      'text-opacity': 0.12,
    },
  },
  {
    selector: '.hidden',
    style: {
      display: 'none',
    },
  },
  {
    selector: '.highlighted',
    style: {
      'border-color': '#0284c7',
      'border-width': '4px',
      'background-color': 'data(branchColor)',
      color:'white'
    },
  },
];
