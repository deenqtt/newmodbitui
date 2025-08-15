// File: components/devices/edit-controller-form.tsx

import { FormEvent } from "react";

type AccessController = {
  id: string;
  name: string;
  ipAddress: string;
};

type EditControllerFormProps = {
  controller: AccessController | null;
  onSave: (id: string, name: string, ipAddress: string) => void;
  onCancel: () => void;
};

export function EditControllerForm({
  controller,
  onSave,
  onCancel,
}: EditControllerFormProps) {
  if (!controller) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const ipAddress = formData.get("ipAddress") as string;
    onSave(controller.id, name, ipAddress);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="edit-name"
          className="block text-sm font-medium text-gray-700"
        >
          Device Name
        </label>
        <input
          id="edit-name"
          name="name"
          type="text"
          defaultValue={controller.name}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label
          htmlFor="edit-ip"
          className="block text-sm font-medium text-gray-700"
        >
          IP Address
        </label>
        <input
          id="edit-ip"
          name="ipAddress"
          type="text"
          defaultValue={controller.ipAddress}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
