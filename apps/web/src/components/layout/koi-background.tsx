"use client";

export function KoiBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="pond-water-wash absolute inset-0" />
      <div className="absolute inset-[-12%]">
        <div className="pond-caustic-drift pond-caustic-drift--far absolute inset-0">
          <div className="pond-caustic-tex pond-caustic-tex--far absolute inset-0" />
        </div>
        <div className="pond-caustic-drift pond-caustic-drift--near absolute inset-0">
          <div className="pond-caustic-tex pond-caustic-tex--near absolute inset-0" />
        </div>
        <div className="pond-caustic-tint absolute inset-0" />
      </div>
      <div className="pond-water-depth absolute inset-0" />
    </div>
  );
}
