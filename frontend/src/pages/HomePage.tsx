// frontend/src/pages/HomePage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, HardDrive, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import snapshotService from "../services/snapshot.service";

const HomePage = () => {
  const {
    data: snapshots,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["snapshots"],
    queryFn: () => snapshotService.getAllSnapshots(),
    staleTime: 60000,
  });

  const latestSnapshot = snapshots?.[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h1 className="text-2xl font-bold mb-2 md:mb-0">
          System Monitor Dashboard
        </h1>

        <div className="flex gap-2">
          <Link
            to="/snapshots"
            className="btn btn-outline flex items-center gap-2"
          >
            <HardDrive size={18} />
            All Snapshots
          </Link>

          <button
            onClick={() => {
              toast.promise(snapshotService.runCollection({}), {
                loading: "Collecting system snapshot...",
                success: (data) => `${data.message}`,
                error: "Failed to collect snapshot",
              });
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Sparkles size={18} />
            Collect New Snapshot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-2">Latest Snapshot</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-red-500">Error loading snapshots</p>
          ) : latestSnapshot ? (
            <div className="space-y-2">
              <p className="text-gray-600">
                <span className="font-medium">Date:</span>{" "}
                {new Date(latestSnapshot.timestamp).toLocaleString()}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Description:</span>{" "}
                {latestSnapshot.description || "No description"}
              </p>
              <div className="mt-4">
                <Link
                  to={`/snapshots/${latestSnapshot.id}`}
                  className="text-primary-600 hover:text-primary-800 font-medium"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ) : (
            <p>No snapshots available.</p>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-2">Recent Analysis</h2>
          <p className="text-gray-600">
            Run analysis on your system snapshots to get insights and
            recommendations.
          </p>
          <div className="mt-4">
            {latestSnapshot ? (
              <Link
                to={`/analysis/${latestSnapshot.id}`}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium"
              >
                <BarChart2 size={18} />
                Analyze Latest Snapshot
              </Link>
            ) : (
              <p className="text-gray-500 italic">Collect a snapshot first</p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-2">Quick Stats</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600">Total Snapshots</p>
              <p className="text-2xl font-bold">{snapshots?.length || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Recent Changes</p>
              <p className="text-gray-500">
                Select two snapshots to compare changes
              </p>
              <Link
                to="/snapshots"
                className="text-primary-600 hover:text-primary-800 font-medium"
              >
                Compare Snapshots →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">About System Monitor</h2>
        <p className="text-gray-600 mb-3">
          System Monitor is a comprehensive tool suite for monitoring, tracking,
          and analyzing Windows system state over time. It helps you understand
          what's happening on your system, identify issues, and get AI-powered
          recommendations for improvements.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Monitor</h3>
            <p className="text-gray-600 text-sm">
              Collect detailed snapshots of your system state including
              installed programs, services, network configuration, and more.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Compare</h3>
            <p className="text-gray-600 text-sm">
              Compare snapshots to see what changed between different points in
              time, helping you identify unexpected modifications.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Analyze</h3>
            <p className="text-gray-600 text-sm">
              Get AI-powered insights and recommendations based on your system
              state, helping you optimize performance and identify security
              issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
