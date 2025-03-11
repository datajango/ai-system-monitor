// frontend/src/pages/SnapshotDetailPage.tsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  Calendar,
  FileText,
  ChevronDown,
  ChevronRight,
  BarChart2,
} from "lucide-react";
import snapshotService from "../services/snapshot.service";

const SnapshotDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const {
    data: snapshot,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["snapshot", id],
    queryFn: () => snapshotService.getSnapshotById(id!),
    enabled: !!id,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Helper function to render different types of data
  const renderValue = (value: any): JSX.Element => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }

    if (typeof value === "boolean") {
      return (
        <span className={value ? "text-green-600" : "text-red-600"}>
          {value.toString()}
        </span>
      );
    }

    if (typeof value === "object") {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return <span className="text-gray-400 italic">empty array</span>;
        }

        return (
          <div className="pl-4 border-l-2 border-gray-200">
            {value.map((item, index) => (
              <div key={index} className="mb-1">
                <span className="text-gray-500">[{index}]:</span>{" "}
                {renderValue(item)}
              </div>
            ))}
          </div>
        );
      }

      return (
        <div className="pl-4 border-l-2 border-gray-200">
          {Object.entries(value).map(([key, val]) => (
            <div key={key} className="mb-1">
              <span className="text-gray-500">{key}:</span> {renderValue(val)}
            </div>
          ))}
        </div>
      );
    }

    return <span>{value.toString()}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">Loading snapshot data...</div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-md">
        <h2 className="text-lg font-medium mb-2">Error Loading Snapshot</h2>
        <p>
          Unable to load the snapshot data. It may have been deleted or moved.
        </p>
        <Link
          to="/snapshots"
          className="mt-4 inline-block text-red-700 hover:text-red-800 font-medium"
        >
          ← Back to Snapshots
        </Link>
      </div>
    );
  }

  const sections = Object.keys(snapshot.data).sort();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link
            to="/snapshots"
            className="btn btn-outline btn-sm flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Back to Snapshots
          </Link>
          <h1 className="text-2xl font-bold">Snapshot Details</h1>
        </div>

        <Link
          to={`/analysis/${id}`}
          className="btn btn-primary flex items-center gap-2"
        >
          <BarChart2 size={18} />
          Analyze Snapshot
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          {snapshot.description ||
            `Snapshot ${snapshot.id.split("_").slice(1).join("_")}`}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-2">
            <Calendar size={20} className="text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">{formatDate(snapshot.timestamp)}</p>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-2">
            <Clock size={20} className="text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Time</p>
              <p className="font-medium">{formatTime(snapshot.timestamp)}</p>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-2">
            <FileText size={20} className="text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">ID</p>
              <p className="font-medium text-sm truncate">{snapshot.id}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {sections.map((section) => {
            const isExpanded = expandedSections.includes(section);
            return (
              <div
                key={section}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100"
                  onClick={() => toggleSection(section)}
                >
                  <span className="font-medium">{section}</span>
                  {isExpanded ? (
                    <ChevronDown size={20} className="text-gray-500" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-500" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 overflow-auto max-h-96 bg-white">
                    {renderValue(snapshot.data[section])}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SnapshotDetailPage;
