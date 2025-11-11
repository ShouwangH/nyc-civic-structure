// ABOUTME: Hover tooltip component for capital budget projects
// ABOUTME: Displays project details including budget allocations and timeline

import type { TooltipProps } from './types';

/**
 * Tooltip component showing project information on hover
 */
export function Tooltip({ project }: TooltipProps) {
  if (!project) {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-10">
      <div className="font-semibold text-gray-900">{project.properties.description}</div>
      <div className="text-sm text-gray-600 mt-1">
        <div>
          <span className="font-medium">Project ID:</span> {project.properties.maprojid}
        </div>
        <div>
          <span className="font-medium">Agency:</span> {project.properties.magencyname} (
          {project.properties.magencyacro})
        </div>
        <div>
          <span className="font-medium">Type:</span> {project.properties.typecategory}
        </div>
        <div>
          <span className="font-medium">Allocated:</span> $
          {(project.properties.allocate_total / 1000000).toFixed(1)}M
        </div>
        <div>
          <span className="font-medium">Committed:</span> $
          {(project.properties.commit_total / 1000000).toFixed(1)}M
        </div>
        <div>
          <span className="font-medium">Spent:</span> $
          {(project.properties.spent_total / 1000000).toFixed(1)}M
        </div>
        {project.properties.fiscalYear && (
          <div>
            <span className="font-medium">Start Year:</span> {project.properties.fiscalYear}
          </div>
        )}
        {project.properties.completionYear && (
          <div>
            <span className="font-medium">Est. Completion:</span>{' '}
            {project.properties.completionYear}
          </div>
        )}
      </div>
    </div>
  );
}
