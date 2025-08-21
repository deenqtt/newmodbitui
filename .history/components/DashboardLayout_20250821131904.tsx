// components/DashboardLayout.tsx
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { WidgetLayout } from "@/app/(dashboard)/page";
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardLayoutProps {
  layout: WidgetLayout[];
}
export default function DashboardLayout({ layout }: DashboardLayoutProps) {
  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={{ lg: layout }}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={30}
      isDraggable={false}
      isResizable={false}
    >
      {layout.map((item) => (
        <div
          key={item.i}
          className="bg-background rounded-lg shadow-sm border flex flex-col overflow-hidden"
        >
          <div className="flex-1 w-full h-full">
            <WidgetRenderer item={item} />
          </div>
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}
