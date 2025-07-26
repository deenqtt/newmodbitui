"use client";

import { useState, useEffect, useMemo, FC, useCallback } from "react";
import axios from "axios";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";
import Select from "react-select";
import { useMqtt } from "@/contexts/MqttContext"; // Pastikan path ke MqttContext benar

// --- Tipe Data ---
interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
  lastPayload: any;
}

interface PduItem {
  uniqId: string;
  name: string; // Ditambahkan untuk detail modal
  keys: string[];
}

interface MainPowerItem {
  uniqId: string;
  key: string;
}

interface PowerAnalyzerConfig {
  id: string;
  customName: string;
  pduList: PduItem[];
  mainPower: MainPowerItem;
  apiTopic: {
    uniqId: string;
    name: string;
    topic: string;
  };
}

interface SelectOption {
  value: string;
  label: string;
}

// --- Komponen Utama ---
const PowerAnalyzerTab: FC = () => {
  // --- States ---
  const [configs, setConfigs] = useState<PowerAnalyzerConfig[]>([]);
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [liveData, setLiveData] = useState<{ [topic: string]: any }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // State untuk form
  const [customName, setCustomName] = useState("");
  const [pduList, setPduList] = useState<
    { uniqId: string | null; keys: string[] }[]
  >([{ uniqId: null, keys: [] }]);
  const [mainPower, setMainPower] = useState<{
    uniqId: string | null;
    key: string | null;
  }>({
    uniqId: null,
    key: null,
  });

  const [selectedConfig, setSelectedConfig] =
    useState<PowerAnalyzerConfig | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // --- MQTT ---
  const { subscribe, unsubscribe } = useMqtt();

  const handleMqttMessage = useCallback((topic: string, payload: string) => {
    try {
      const parsedPayload = JSON.parse(payload);
      setLiveData((prev) => ({ ...prev, [topic]: parsedPayload }));
    } catch (e) {
      console.error("Failed to parse MQTT payload:", e);
    }
  }, []);

  useEffect(() => {
    const allTopics = new Set<string>();
    configs.forEach((config) => {
      // Tambahkan topic main power
      const mainPowerDevice = devices.find(
        (d) => d.uniqId === config.mainPower.uniqId
      );
      if (mainPowerDevice) allTopics.add(mainPowerDevice.topic);

      // Tambahkan topic dari setiap pdu
      config.pduList.forEach((pdu) => {
        const pduDevice = devices.find((d) => d.uniqId === pdu.uniqId);
        if (pduDevice) allTopics.add(pduDevice.topic);
      });
    });

    const topicsToSubscribe = Array.from(allTopics);

    // Subscribe ke semua topic yang diperlukan
    topicsToSubscribe.forEach((topic) => subscribe(topic, handleMqttMessage));

    // Cleanup: unsubscribe saat komponen unmount atau daftar config berubah
    return () => {
      topicsToSubscribe.forEach((topic) =>
        unsubscribe(topic, handleMqttMessage)
      );
    };
  }, [configs, devices, subscribe, unsubscribe, handleMqttMessage]);

  // --- Opsi untuk React-Select ---
  const deviceOptions: SelectOption[] = useMemo(
    () => devices.map((d) => ({ value: d.uniqId, label: d.name })),
    [devices]
  );

  const getKeyOptions = (uniqId: string | null): SelectOption[] => {
    if (!uniqId) return [];
    const device = devices.find((d) => d.uniqId === uniqId);

    // Gunakan data real-time jika ada, jika tidak, gunakan lastPayload
    const payload = liveData[device?.topic || ""] || device?.lastPayload;
    if (!payload) return [];

    return Object.keys(payload)
      .filter((key) => typeof payload[key] === "number")
      .map((key) => ({ value: key, label: key }));
  };

  // --- Efek untuk Fetch Data ---
  useEffect(() => {
    fetchData();
    fetchDevices();
  }, []);

  // --- Fungsi API (Sama seperti sebelumnya) ---
  const fetchData = async () => {
    /* ... (Sama seperti sebelumnya) ... */
  };
  const fetchDevices = async () => {
    /* ... (Sama seperti sebelumnya) ... */
  };

  // --- Fungsi Kalkulasi PUE (Sesuai Permintaan) ---
  const getPduValue = (pdu: PduItem): number | null => {
    const device = devices.find((d) => d.uniqId === pdu.uniqId);
    if (!device) return null;

    const payload = liveData[device.topic];
    if (!payload) return null;

    return pdu.keys.reduce((sum, key) => sum + (payload[key] || 0), 0);
  };

  const getMainPowerValue = (config: PowerAnalyzerConfig): number | null => {
    const device = devices.find((d) => d.uniqId === config.mainPower.uniqId);
    if (!device) return null;

    const payload = liveData[device.topic];
    if (!payload || payload[config.mainPower.key] === undefined) return null;

    return payload[config.mainPower.key];
  };

  const calculateTotalPUE = (config: PowerAnalyzerConfig): string => {
    const mainPowerValue = getMainPowerValue(config);
    if (mainPowerValue === null) return "N/A";

    const totalItPower = config.pduList.reduce((sum, pdu) => {
      const pduValue = getPduValue(pdu);
      return sum + (pduValue || 0);
    }, 0);

    // Menggunakan formula Anda: IT Power / Main Power
    if (mainPowerValue === 0) return "N/A"; // Hindari pembagian dengan 0

    return `${((totalItPower / mainPowerValue) * 100).toFixed(2)}%`;
  };

  const calculatePUEForPdu = (
    mainPowerValue: number | null,
    pduValue: number | null
  ): string => {
    if (mainPowerValue == null || pduValue == null) return "N/A"; // Jika nilai null, tampilkan N/A
    if (mainPowerValue === 0) return "N/A"; // Hindari pembagian dengan 0
    return `${((pduValue / mainPowerValue) * 100).toFixed(2)}%`; // Hitung persentase
  };

  // --- Pagination Logic ---
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return configs.slice(start, start + itemsPerPage);
  }, [configs, currentPage]);

  const totalPages = useMemo(
    () => Math.ceil(configs.length / itemsPerPage),
    [configs]
  );

  // --- Handlers (Sama seperti sebelumnya) ---
  const handleOpenModal = (config: PowerAnalyzerConfig | null = null) => {
    /* ... */
  };
  const handleCloseModal = () => {
    /* ... */
  };
  const handleSubmit = async (e: React.FormEvent) => {
    /* ... */
  };
  const handleDelete = (id: string) => {
    /* ... */
  };
  const addPdu = () => {
    /* ... */
  };
  const removePdu = (index: number) => {
    /* ... */
  };
  const handlePduChange = (
    index: number,
    field: "uniqId" | "keys",
    value: any
  ) => {
    /* ... */
  };

  const handleShowDetails = (config: PowerAnalyzerConfig) => {
    setSelectedConfig(config);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="d-flex justify-content-between mb-4">
        <h5>Power Analyzer</h5>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} className="d-inline-block me-1" />
          Add Data
        </button>
      </div>

      {/* Tabel Data */}
      <div className="content-style-secondary">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Custom Name</th>
                <th>Total PDU/Rack</th>
                <th>PUE (IT Power / Main Power)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center p-4">
                    Loading...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-4">
                    No data available
                  </td>
                </tr>
              ) : (
                paginatedData.map((config, index) => (
                  <tr key={config.id}>
                    <td>{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                    <td>{config.customName}</td>
                    <td>{config.pduList?.length || 0}</td>
                    <td>
                      {calculateTotalPUE(config)}
                      <button
                        className="btn btn-sm btn-info ms-2"
                        onClick={() => handleShowDetails(config)}
                      >
                        Detail
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => handleOpenModal(config)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(config.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <nav>
            <ul className="pagination justify-content-center">
              {/* ... (Logika pagination buttons) ... */}
            </ul>
          </nav>
        )}
      </div>

      {/* Modal Tambah/Edit */}
      {isModalOpen && (
        <div
          className="modal fade show"
          style={{ display: "block" }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingId ? "Edit" : "Add"} Data
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                ></button>
              </div>
              <div className="modal-body">
                {/* Form (Sama seperti kode sebelumnya, menggunakan react-select) */}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                >
                  {editingId ? "Save Changes" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {isDetailModalOpen && selectedConfig && (
        <div
          className="modal fade show"
          style={{ display: "block" }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Detail PUE for {selectedConfig.customName}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsDetailModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Rack Name</th>
                      <th>PUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedConfig.pduList.map((pdu, index) => {
                      const mainPowerValue = getMainPowerValue(selectedConfig);
                      const pduValue = getPduValue(pdu);
                      return (
                        <tr key={pdu.uniqId}>
                          <td>{index + 1}</td>
                          <td>{pdu.name || `PDU-${index + 1}`}</td>
                          <td>
                            {calculatePUEForPdu(mainPowerValue, pduValue)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {(isModalOpen || isDetailModalOpen) && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
};

export default PowerAnalyzerTab;
