// src/pages/SnapshotsPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HardDrive, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SnapshotItem from "../components/snapshots/SnapshotItem";
import snapshotService from "../services/snapshot.service";

const SnapshotsPage = () => {
  const {
    data: snapshots,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["snapshots"],
    queryFn: () => snapshotService.getAllSnapshots(),
  });

  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionDescription, setCollectionDescription] = useState("");

  const handleSnapshotSelect = (id: string) => {
    setSelectedSnapshots((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        const newSelection = [...prev, id].slice(-2); // Only keep the last 2
        return newSelection;
      }
    });
  };

  const handleCollectSnapshot = async () => {
    try {
      setIsCollecting(true);
      await toast.promise(
        snapshotService.runCollection({
          description: collectionDescription,
          compareWithLatest: snapshots && snapshots.length > 0,
        }),
        {
          loading: "Collecting system snapshot...",
          success: (data) => {
            refetch();
            setCollectionDescription("");
            return data.message;
          },
          error: "Failed to collect snapshot",
        }
      );
    } finally {
      setIsCollecting(false);
    }
  };

  const handleCompareSnapshots = () => {
    if (selectedSnapshots.length !== 2) {
      toast.error("Please select exactly two snapshots to compare");
      return;
    }

    toast.info(
      "Comparison functionality will be implemented in a future update"
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and controls ... */}

      {/* Snapshots list */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
          <span className="ml-2">Loading snapshots...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          Error loading snapshots. Please try again.
        </div>
      ) : snapshots && snapshots.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden dark:bg-gray-800">
          {snapshots.map((snapshot) => (
            <SnapshotItem
              key={snapshot.id}
              snapshot={snapshot}
              isSelected={selectedSnapshots.includes(snapshot.id)}
              onSelect={handleSnapshotSelect}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow flex flex-col items-center justify-center p-12 text-center dark:bg-gray-800">
          <HardDrive
            size={64}
            className="text-gray-300 mb-4 dark:text-gray-600"
          />
          <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
            No snapshots available
          </h2>
          <p className="text-gray-500 mt-2 mb-6 max-w-md dark:text-gray-400">
            Collect your first snapshot to start monitoring your system state.
          </p>
          <button
            onClick={handleCollectSnapshot}
            disabled={isCollecting}
            className="btn btn-primary flex items-center gap-2"
          >
            {isCollecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Collecting...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Collect First Snapshot
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default SnapshotsPage;
