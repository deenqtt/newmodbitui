"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { Plus, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Select from "react-select";
import { useMqtt } from "@/contexts/MqttContext"; // Sesuaikan path ke MqttContext Anda

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
export function PowerAnalyzerTab() {
  // --- States ---
  const [configs, setConfigs] = useState<PowerAnalyzerConfig[]>([]);
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [liveData, setLiveData] = useState<{ [topic: string]: any }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] =
    useState<PowerAnalyzerConfig | null>(null);

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
      const mainPowerDevice = devices.find(
        (d) => d.uniqId === config.mainPower.uniqId
      );
      if (mainPowerDevice) allTopics.add(mainPowerDevice.topic);
      config.pduList.forEach((pdu) => {
        const pduDevice = devices.find((d) => d.uniqId === pdu.uniqId);
        if (pduDevice) allTopics.add(pduDevice.topic);
      });
    });
    const topicsToSubscribe = Array.from(allTopics);
    topicsToSubscribe.forEach((topic) => subscribe(topic, handleMqttMessage));
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
    const payload = liveData[device?.topic || ""] || device?.lastPayload;
    if (!payload) return [];
    return Object.keys(payload)
      .filter((key) => typeof payload[key] === "number")
      .map((key) => ({ value: key, label: key }));
  };

  // --- Efek untuk Fetch Data ---
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [configsRes, devicesRes] = await Promise.all([
        axios.get<PowerAnalyzerConfig[]>("/api/power-analyzer"),
        axios.get<DeviceForSelection[]>("/api/devices/for-selection"),
      ]);
      setConfigs(configsRes.data);
      setDevices(devicesRes.data);
    } catch (error) {
      toast.error("Gagal memuat data awal.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- Fungsi Kalkulasi PUE ---
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
    const totalItPower = config.pduList.reduce(
      (sum, pdu) => sum + (getPduValue(pdu) || 0),
      0
    );
    if (mainPowerValue === 0) return "N/A";
    return `${((totalItPower / mainPowerValue) * 100).toFixed(2)}%`;
  };

  const calculatePUEForPdu = (
    mainPowerValue: number | null,
    pduValue: number | null
  ): string => {
    if (mainPowerValue == null || pduValue == null) return "N/A";
    if (mainPowerValue === 0) return "N/A";
    return `${((pduValue / mainPowerValue) * 100).toFixed(2)}%`;
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

  // --- Handlers ---
  const resetForm = () => {
    setCustomName("");
    setPduList([{ uniqId: null, keys: [] }]);
    setMainPower({ uniqId: null, key: null });
    setEditingId(null);
  };

  const handleOpenModal = (config: PowerAnalyzerConfig | null = null) => {
    if (config) {
      setEditingId(config.id);
      setCustomName(config.customName);
      setPduList(
        config.pduList.map((p) => ({ uniqId: p.uniqId, keys: p.keys }))
      );
      setMainPower({
        uniqId: config.mainPower.uniqId,
        key: config.mainPower.key,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !customName ||
      !mainPower.uniqId ||
      !mainPower.key ||
      pduList.some((p) => !p.uniqId || p.keys.length === 0)
    ) {
      toast.error("Harap isi semua field yang wajib diisi.");
      return;
    }
    const payload = { customName, pduList, mainPower };
    const promise = editingId
      ? axios.put(`/api/power-analyzer/${editingId}`, payload)
      : axios.post("/api/power-analyzer", payload);
    toast.promise(promise, {
      loading: "Menyimpan data...",
      success: () => {
        fetchAllData();
        handleCloseModal();
        return `Data berhasil ${editingId ? "diperbarui" : "disimpan"}!`;
      },
      error: (err) => err.response?.data?.message || "Gagal menyimpan data.",
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      const promise = axios.delete(`/api/power-analyzer/${id}`);
      toast.promise(promise, {
        loading: "Menghapus data...",
        success: () => {
          fetchAllData();
          return "Data berhasil dihapus!";
        },
        error: (err) => err.response?.data?.message || "Gagal menghapus data.",
      });
    }
  };

  const handleShowDetails = (config: PowerAnalyzerConfig) => {
    setSelectedConfig(config);
    setIsDetailModalOpen(true);
  };

  const addPdu = () => setPduList([...pduList, { uniqId: null, keys: [] }]);
  const removePdu = (index: number) =>
    setPduList(pduList.filter((_, i) => i !== index));
  const handlePduChange = (
    index: number,
    field: "uniqId" | "keys",
    value: any
  ) => {
    const newList = [...pduList];
    if (field === "uniqId") {
      newList[index] = { uniqId: value, keys: [] };
    } else {
      newList[index] = { ...newList[index], keys: value };
    }
    setPduList(newList);
  };

  return (
    <>
      <div className="content-style-secondary mb-4">
        <div className="d-flex justify-content-between">
          <h5>Power Analyzer</h5>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => handleOpenModal()}
          >
            <Plus size={16} className="d-inline-block me-1" />
            Add Data
          </button>
        </div>
      </div>

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
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(config.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <nav>
            <ul className="pagination justify-content-center">
              {/* Pagination buttons can be added here */}
            </ul>
          </nav>
        )}
      </div>

      {/* --- MODALS --- */}
      {(isModalOpen || isDetailModalOpen) && (
        <div className="modal-backdrop fade show"></div>
      )}

      {/* Modal Tambah/Edit */}
      <div
        className={`modal fade ${isModalOpen ? "show d-block" : ""}`}
        tabIndex={-1}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editingId ? "Edit" : "Add"} Data</h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseModal}
              ></button>
            </div>
            <div
              className="modal-body"
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="customName" className="form-label">
                    Custom Name
                  </label>
                  <input
                    type="text"
                    id="customName"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
                <hr />
                <h6 className="mt-3">PDU (Racks) / IT Power</h6>
                {pduList.map((pdu, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg mb-3 bg-light position-relative"
                  >
                    <div className="row g-2">
                      <div className="col-md-6">
                        <label className="form-label fs-sm">
                          Select Topic (Rack)
                        </label>
                        <Select
                          options={deviceOptions}
                          value={deviceOptions.find(
                            (o) => o.value === pdu.uniqId
                          )}
                          onChange={(opt) =>
                            handlePduChange(index, "uniqId", opt?.value)
                          }
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fs-sm">Select Keys</label>
                        <Select
                          options={getKeyOptions(pdu.uniqId)}
                          isMulti
                          value={getKeyOptions(pdu.uniqId).filter((o) =>
                            pdu.keys.includes(o.value)
                          )}
                          onChange={(opts) =>
                            handlePduChange(
                              index,
                              "keys",
                              opts.map((o) => o.value)
                            )
                          }
                          isDisabled={!pdu.uniqId}
                          closeMenuOnSelect={false}
                          required
                        />
                      </div>
                    </div>
                    {pduList.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                        style={{ lineHeight: 1, padding: ".25rem .5rem" }}
                        onClick={() => removePdu(index)}
                      >
                        X
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-sm btn-primary mb-3"
                  onClick={addPdu}
                >
                  Add Rack/PDU
                </button>
                <hr />
                <h6 className="mt-3">Main Power</h6>
                <div className="row g-2 p-3 border rounded-lg bg-light">
                  <div className="col-md-6">
                    <label className="form-label fs-sm">Select Topic</label>
                    <Select
                      options={deviceOptions}
                      value={deviceOptions.find(
                        (o) => o.value === mainPower.uniqId
                      )}
                      onChange={(opt) =>
                        setMainPower({ uniqId: opt?.value || null, key: null })
                      }
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fs-sm">Select Key</label>
                    <Select
                      options={getKeyOptions(mainPower.uniqId)}
                      value={getKeyOptions(mainPower.uniqId).find(
                        (o) => o.value === mainPower.key
                      )}
                      onChange={(opt) =>
                        setMainPower({ ...mainPower, key: opt?.value || null })
                      }
                      isDisabled={!mainPower.uniqId}
                      required
                    />
                  </div>
                </div>
              </form>
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

      {/* Modal Detail */}
      <div
        className={`modal fade ${isDetailModalOpen ? "show d-block" : ""}`}
        tabIndex={-1}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Detail PUE for {selectedConfig?.customName}
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
                  {selectedConfig?.pduList.map((pdu, index) => {
                    const mainPowerValue = getMainPowerValue(selectedConfig);
                    const pduValue = getPduValue(pdu);
                    return (
                      <tr key={pdu.uniqId}>
                        <td>{index + 1}</td>
                        <td>{pdu.name || `PDU-${index + 1}`}</td>
                        <td>{calculatePUEForPdu(mainPowerValue, pduValue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
