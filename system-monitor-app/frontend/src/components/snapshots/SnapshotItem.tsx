// src/components/snapshots/SnapshotItem.tsx
import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  HardDrive,
  ArrowRight,
  BarChart2,
  FileText,
} from "lucide-react";
import {
  formatDate,
  formatTime,
  getSnapshotDisplayName,
} from "../../utils/dateUtils";
import { Snapshot } from "../../services/snapshot.service";

interface SnapshotItemProps {
  snapshot: Snapshot;
  isSelected: boolean;
  onSelect: (id: string) => void;
  showActions?: boolean;
}

const SnapshotItem: React.FC<SnapshotItemProps> = ({
  snapshot,
  isSelected,
  onSelect,
  showActions = true,
}) => {
  // Format dates and times
  const formattedDate = formatDate(snapshot.timestamp);
  const formattedTime = formatTime(snapshot.timestamp);
  const displayName =
    snapshot.description || getSnapshotDisplayName(snapshot.id);

  return (
    <div
      className={`border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150 ${
        isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""
      } dark:border-gray-700 dark:hover:bg-gray-800/50`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        {/* Checkbox and Icon */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(snapshot.id)}
            className="h-5 w-5 rounded text-primary-600 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            aria-label={`Select snapshot ${displayName}`}
          />
          <HardDrive size={20} className="text-gray-500 dark:text-gray-400" />
        </div>

        {/* Snapshot Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate dark:text-gray-100">
            {displayName}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {formattedTime}
            </span>
            <span className="flex items-center gap-1 hidden sm:flex">
              <FileText size={14} />
              <span
                className="font-mono truncate max-w-[150px] md:max-w-[300px]"
                title={snapshot.id}
              >
                {snapshot.id}
              </span>
            </span>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 self-end md:self-center mt-2 md:mt-0">
            <Link
              to={`/snapshots/${snapshot.id}`}
              className="btn btn-outline btn-sm flex items-center gap-1 text-xs px-3 py-1"
            >
              View Details
              <ArrowRight size={14} />
            </Link>
            <Link
              to={`/analysis/${snapshot.id}`}
              className="btn btn-primary btn-sm text-xs px-3 py-1"
            >
              <BarChart2 size={14} className="mr-1" />
              Analyze
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnapshotItem;
