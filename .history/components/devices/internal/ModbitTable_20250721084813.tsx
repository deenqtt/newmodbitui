"use client";
import { GenericInternalTable } from "./GenericInternalTable";

export function ModbitTable() {
  return (
    <GenericInternalTable
      title="Modbit Devices"
      commandTopic="command_device_i2c_plain"
      responseTopic="response_device_i2c_plain"
      getDataCommand="getDataI2C"
    />
  );
}
