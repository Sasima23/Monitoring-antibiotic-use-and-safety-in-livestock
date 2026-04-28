import { useEffect, useState } from "react";

function FarmerPage() {

  const [temp, setTemp] = useState(0);

  useEffect(() => {

    const interval = setInterval(() => {

      fetch("http://localhost:5000/temperature")
        .then(res => res.json())
        .then(data => setTemp(data.temperature));

    }, 2000);

    return () => clearInterval(interval);

  }, []);

  return (
    <div>
      <h2>Cow Temperature</h2>
      <h1>{temp} °C</h1>
    </div>
  );
}

export default FarmerPage;