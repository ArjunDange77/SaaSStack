import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";
import type { PublicSeatmapPayload, PublicSeatmapRoom } from "@/types/publicSeatmap";
import { BookingStepIndicator } from "@/components/pg/BookingStepIndicator";
import { FloorNavPips } from "./FloorNavPips";
import { FloorSection } from "./FloorSection";
import { RoomDetailPanel } from "./RoomDetailPanel";
import { SeatMapLegend } from "./SeatMapLegend";
import { SeatMapStatsBar } from "./SeatMapStatsBar";

interface Props {
  data: PublicSeatmapPayload;
  selectedRoom: PublicSeatmapRoom | null;
  onSelectRoom: (room: PublicSeatmapRoom) => void;
  onConfirmSelection: () => void;
  onChooseLater: () => void;
}

export function BookingSeatMap({
  data,
  selectedRoom,
  onSelectRoom,
  onConfirmSelection,
  onChooseLater,
}: Props) {
  const isMobile = useIsMobile();
  const floorAreaRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [hoveredRoom, setHoveredRoom] = useState<PublicSeatmapRoom | null>(null);
  const [activeFloorKey, setActiveFloorKey] = useState<string | null>(
    data.floors[0]?.key ?? null
  );
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const panelRoom = selectedRoom ?? hoveredRoom;
  const panelFloorLabel = useMemo(() => {
    if (!panelRoom) return undefined;
    const fl = data.floors.find((f) => f.rooms.some((r) => r.id === panelRoom.id));
    return fl?.label;
  }, [data.floors, panelRoom]);

  const scrollToFloor = useCallback((floorKey: string) => {
    const root = floorAreaRef.current;
    const el = sectionRefs.current.get(floorKey);
    if (!root || !el) return;
    const top = el.offsetTop - root.offsetTop;
    root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    setActiveFloorKey(floorKey);
  }, []);

  useEffect(() => {
    const root = floorAreaRef.current;
    if (!root || data.floors.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top?.target.id.startsWith("floor-")) return;
        const key = top.target.id.replace("floor-", "");
        setActiveFloorKey(key);
      },
      { root, rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [data.floors]);

  const handleSelect = (room: PublicSeatmapRoom) => {
    onSelectRoom(room);
    if (isMobile) setMobileSheetOpen(true);
  };

  const handleHover = (room: PublicSeatmapRoom | null) => {
    if (isMobile) return;
    setHoveredRoom(room);
  };

  const handleTileTap = (room: PublicSeatmapRoom) => {
    onSelectRoom(room);
    setHoveredRoom(room);
    if (isMobile) setMobileSheetOpen(true);
  };

  return (
    <div className="public-booking-seatmap">
      <div className="seatmap-shell">
        {!isMobile && (
          <FloorNavPips
            floors={data.floors}
            activeFloorKey={activeFloorKey}
            onFloorSelect={scrollToFloor}
            variant="sidebar"
          />
        )}

        <div className="seatmap-center">
          <div className="top-bar">
            <div className="tb-row">
              <div>
                <h1 className="tb-title">Book a stay</h1>
                <p className="tb-sub">{data.tenant.name} · ~2 min</p>
              </div>
              <BookingStepIndicator current="rooms" variant="compact" />
            </div>
            {isMobile && (
              <FloorNavPips
                floors={data.floors}
                activeFloorKey={activeFloorKey}
                onFloorSelect={scrollToFloor}
                variant="chips"
              />
            )}
            <SeatMapLegend />
          </div>

          <div className="floor-area" ref={floorAreaRef}>
            {data.floors.map((floor) => (
              <FloorSection
                key={floor.key}
                floor={floor}
                selectedRoomId={selectedRoom?.id ?? null}
                onHover={handleHover}
                onSelect={isMobile ? handleTileTap : handleSelect}
                sectionRef={(el) => {
                  if (el) sectionRefs.current.set(floor.key, el);
                  else sectionRefs.current.delete(floor.key);
                }}
              />
            ))}
          </div>

          <SeatMapStatsBar summary={data.summary} />
        </div>

        {!isMobile && (
          <aside className="right-panel">
            <RoomDetailPanel
              room={panelRoom}
              floorLabel={panelFloorLabel}
              onSelect={onConfirmSelection}
              onChooseLater={onChooseLater}
            />
          </aside>
        )}
      </div>

      {isMobile && mobileSheetOpen && panelRoom && (
        <div
          className="modal-backdrop seatmap-sheet-backdrop"
          role="presentation"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="modal seatmap-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Room details"
            onClick={(e) => e.stopPropagation()}
          >
            <RoomDetailPanel
              room={panelRoom}
              floorLabel={panelFloorLabel}
              mobileSheet
              onSelect={() => {
                setMobileSheetOpen(false);
                onConfirmSelection();
              }}
              onChooseLater={() => {
                setMobileSheetOpen(false);
                onChooseLater();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
