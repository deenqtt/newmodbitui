"use client";

import { useState, useEffect, useMemo, FC } from "react";
import axios from "axios";
import { Plus, MoreVertical, Edit, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";
import Select from "react-select";

// --- Tipe Data (Sangat Penting untuk TypeScript) ---

interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
  lastPayload: any;
}

interface PduItem {
  uniqId: string;
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
  apiTopic?: {
    name: string;
    topic: string;
  };
  // Tambahkan properti dinamis untuk nilai MQTT
  pduValues?: { [uniqId: string]: number };
  mainPowerValue?: number;
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

  // --- Opsi untuk React-Select ---
  const deviceOptions: SelectOption[] = useMemo(
    () => devices.map((d) => ({ value: d.uniqId, label: d.name })),
    [devices]
  );

  const getKeyOptions = (uniqId: string | null): SelectOption[] => {
    if (!uniqId) return [];
    const device = devices.find((d) => d.uniqId === uniqId);
    if (!device || !device.lastPayload) return [];

    // Filter hanya key yang mengandung 'power' (case-insensitive)
    return Object.keys(device.lastPayload)
      .filter(
        (key) =>
          typeof device.lastPayload[key] === "number" &&
          key.toLowerCase().includes("power")
      )
      .map((key) => ({ value: key, label: key }));
  };

  // --- Efek untuk Fetch Data ---
  useEffect(() => {
    fetchData();
    fetchDevices();
  }, []);

  // --- Fungsi API ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get<PowerAnalyzerConfig[]>(
        "/api/power-analyzer"
      );
      setConfigs(data);
    } catch (error) {
      toast.error("Gagal memuat konfigurasi Power Analyzer.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const { data } = await axios.get<DeviceForSelection[]>(
        "/api/devices/for-selection"
      );
      setDevices(data);
    } catch (error) {
      toast.error("Gagal memuat daftar perangkat.");
      console.error(error);
    }
  };

  // --- Fungsi Handler Form ---
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

    // Validasi sederhana
    if (
      !customName ||
      !mainPower.uniqId ||
      !mainPower.key ||
      pduList.some((p) => !p.uniqId || p.keys.length === 0)
    ) {
      toast.error("Harap isi semua field yang wajib diisi.");
      return;
    }

    const payload = {
      customName,
      pduList,
      mainPower,
    };

    const promise = editingId
      ? axios.put(`/api/power-analyzer/${editingId}`, payload)
      : axios.post("/api/power-analyzer", payload);

    toast.promise(promise, {
      loading: "Menyimpan data...",
      success: () => {
        fetchData();
        handleCloseModal();
        return `Data berhasil ${editingId ? "diperbarui" : "disimpan"}!`;
      },
      error: (err) => {
        return err.response?.data?.message || "Gagal menyimpan data.";
      },
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      const promise = axios.delete(`/api/power-analyzer/${id}`);
      toast.promise(promise, {
        loading: "Menghapus data...",
        success: () => {
          fetchData();
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

  // --- Handler untuk Form PDU Dinamis ---
  const addPdu = () => {
    setPduList([...pduList, { uniqId: null, keys: [] }]);
  };

  const removePdu = (index: number) => {
    setPduList(pduList.filter((_, i) => i !== index));
  };

  const handlePduChange = (
    index: number,
    field: "uniqId" | "keys",
    value: any
  ) => {
    const newList = [...pduList];
    if (field === "uniqId") {
      newList[index].uniqId = value;
      newList[index].keys = []; // Reset keys saat device berubah
    } else {
      newList[index].keys = value;
    }
    setPduList(newList);
  };

  // --- Fungsi Kalkulasi (Dummy, akan diganti dengan data MQTT asli) ---
  const calculatePUE = (config: PowerAnalyzerConfig) => {
    // Ini adalah dummy. Di aplikasi nyata, Anda akan mendapatkan nilai dari MQTT context.
    const mainPowerValue = 10000; // Dummy
    const itPower = (config.pduList?.length || 0) * 1500; // Dummy

    if (mainPowerValue === 0 || itPower === 0) return "N/A";
    return `${((itPower / mainPowerValue) * 100).toFixed(2)}%`;
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Power Analyzer</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          <span>Tambah Data</span>
        </button>
      </div>

      {/* Tabel Data */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100">
            <tr>
              <th className="px-6 py-3">#</th>
              <th className="px-6 py-3">Custom Name</th>
              <th className="px-6 py-3">Total PDU/Rack</th>
              <th className="px-6 py-3">PUE (Main Power / IT Power)</th>
              <th className="px-6 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center p-6">
                  Memuat data...
                </td>
              </tr>
            ) : configs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-6">
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              configs.map((config, index) => (
                <tr
                  key={config.id}
                  className="bg-white border-b hover:bg-gray-50"
                >
                  <td className="px-6 py-4">{index + 1}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {config.customName}
                  </td>
                  <td className="px-6 py-4">{config.pduList?.length || 0}</td>
                  <td className="px-6 py-4">
                    {calculatePUE(config)}
                    <button
                      onClick={() => handleShowDetails(config)}
                      className="ml-2 text-blue-600 hover:underline text-xs"
                    >
                      Detail
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleOpenModal(config)}
                      className="text-yellow-500 hover:text-yellow-700 mr-4"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold">
                {editingId ? "Edit" : "Tambah"} Data Power Analyzer
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {/* Custom Name */}
                <div>
                  <label
                    htmlFor="customName"
                    className="block mb-2 text-sm font-medium text-gray-700"
                  >
                    Custom Name
                  </label>
                  <input
                    type="text"
                    id="customName"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>

                <hr />

                {/* PDU (Racks) Section */}
                <h4 className="font-semibold text-gray-800 mt-4">
                  PDU (Racks) / IT Power
                </h4>
                {pduList.map((pdu, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg space-y-3 bg-gray-50 relative"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1 text-xs font-medium text-gray-600">
                          Pilih Perangkat (Rack)
                        </label>
                        <Select
                          options={deviceOptions}
                          value={deviceOptions.find(
                            (opt) => opt.value === pdu.uniqId
                          )}
                          onChange={(opt) =>
                            handlePduChange(index, "uniqId", opt?.value)
                          }
                          placeholder="Pilih perangkat..."
                          isClearable
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs font-medium text-gray-600">
                          Pilih Keys
                        </label>
                        <Select
                          options={getKeyOptions(pdu.uniqId)}
                          isMulti
                          value={getKeyOptions(pdu.uniqId).filter((opt) =>
                            pdu.keys.includes(opt.value)
                          )}
                          onChange={(opts) =>
                            handlePduChange(
                              index,
                              "keys",
                              opts.map((o) => o.value)
                            )
                          }
                          placeholder="Pilih keys..."
                          closeMenuOnSelect={false}
                          isDisabled={!pdu.uniqId}
                        />
                      </div>
                    </div>
                    {pduList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePdu(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        X
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPdu}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Tambah Rack/PDU
                </button>

                <hr />

                {/* Main Power Section */}
                <h4 className="font-semibold text-gray-800 mt-4">Main Power</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-lg bg-gray-50">
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Pilih Perangkat
                    </label>
                    <Select
                      options={deviceOptions}
                      value={deviceOptions.find(
                        (opt) => opt.value === mainPower.uniqId
                      )}
                      onChange={(opt) =>
                        setMainPower({ uniqId: opt?.value || null, key: null })
                      } // Reset key
                      placeholder="Pilih perangkat..."
                      isClearable
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Pilih Key
                    </label>
                    <Select
                      options={getKeyOptions(mainPower.uniqId)}
                      value={getKeyOptions(mainPower.uniqId).find(
                        (opt) => opt.value === mainPower.key
                      )}
                      onChange={(opt) =>
                        setMainPower({ ...mainPower, key: opt?.value || null })
                      }
                      placeholder="Pilih key..."
                      isDisabled={!mainPower.uniqId}
                      isClearable
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {isDetailModalOpen && selectedConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold">
                Detail PUE untuk {selectedConfig.customName}
              </h3>
            </div>
            <div className="p-6">
              {/* Disini Anda akan menampilkan detail kalkulasi PUE per rack */}
              <p>
                Detail PUE akan ditampilkan disini ketika data MQTT sudah
                terintegrasi.
              </p>
            </div>
            <div className="p-6 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PowerAnalyzerTab;
