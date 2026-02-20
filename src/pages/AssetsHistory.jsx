import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { getAssetsHistory } from "../apis/employeeAssets";
import { FaHistory, FaFilter, FaLaptop, FaCar, FaTools, FaBox } from "react-icons/fa";

export default function AssetsHistory() {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [period, setPeriod] = useState("All");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    fetchHistory();
  }, [period, status]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getAssetsHistory({ period, status });
      setHistory(res.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getAssetIcon = (type) => {
    if (type === 'Electronics') return <FaLaptop className="inline mr-1 opacity-70" />;
    if (type === 'Vehicle') return <FaCar className="inline mr-1 opacity-70" />;
    if (type === 'Tools') return <FaTools className="inline mr-1 opacity-70" />;
    return <FaBox className="inline mr-1 opacity-70" />;
  };

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ fontFamily: currentFont.family, color: themeColors.text }}>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: themeColors.text }}>
            <FaHistory className="text-purple-600" /> Assets History
          </h1>
          <p className="text-sm opacity-60" style={{ color: themeColors.text }}>
            Track all asset assignments and returns
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <FaFilter className="opacity-50" />
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}>
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="Week">This Week</option>
              <option value="Month">This Month</option>
              <option value="Year">This Year</option>
            </select>
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}>
            <option value="All">All Status</option>
            <option value="Assigned">Currently Assigned</option>
            <option value="Returned">Returned</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border }}>
        {loading ? (
          <div className="p-8 text-center animate-pulse" style={{ color: themeColors.text }}>Loading History...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center opacity-50" style={{ color: themeColors.text }}>No history found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead style={{ backgroundColor: themeColors.background, color: themeColors.text }} className="text-xs uppercase opacity-70 border-b">
                <tr>
                  <th className="p-4">Asset Details</th>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Assigned Date</th>
                  <th className="p-4">Return Date</th>
                  <th className="p-4">Condition</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm" style={{ borderColor: themeColors.border }}>
                {history.map((item, idx) => (
                  <tr key={idx} className="transition hover:bg-black/5" style={{ color: themeColors.text }}>
                    <td className="p-4">
                      <div className="font-bold flex items-center">
                        {getAssetIcon(item.assetType)}
                        {item.assetName}
                      </div>
                      <div className="text-xs opacity-60">ID: {item.assetId}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{item.employeeName}</div>
                    </td>
                    <td className="p-4">{new Date(item.assignedDate).toLocaleDateString()}</td>
                    <td className="p-4">
                      {item.returnDate ? new Date(item.returnDate).toLocaleDateString() : <span className="text-blue-600 font-semibold">-</span>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs border ${item.conditionOnreturn === 'New' ? 'border-green-200 text-green-700 bg-green-50' : item.conditionOnreturn === 'Good' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-red-200 text-red-700 bg-red-50'}`}>
                        {item.conditionOnreturn}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${!item.returnDate ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {!item.returnDate ? 'Assigned' : 'Returned'}
                      </span>
                    </td>
                    <td className="p-4 text-xs opacity-70">{item.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
