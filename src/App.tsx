import CanvasSlider from "./CanvasSlider";

function App() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
      <CanvasSlider images={["/images/0.jpg", "/images/1.jpg", "/images/2.jpg", "/images/3.jpg"]} />
    </div>
  );
}

export default App;
