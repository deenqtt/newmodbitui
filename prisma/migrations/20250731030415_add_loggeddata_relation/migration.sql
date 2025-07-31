-- AddForeignKey
ALTER TABLE "LoggedData" ADD CONSTRAINT "LoggedData_configId_fkey" FOREIGN KEY ("configId") REFERENCES "LoggingConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
