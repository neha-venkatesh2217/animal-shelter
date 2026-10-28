import { useEffect, useState } from "react";

function App() {
  // Store the animals retrieved from MySQL
  const [animals, setAnimals] = useState([]);
  const [error, setError] = useState("");

  // Retrieve animals when the page loads
  useEffect(() => {
    fetch("http://localhost:3001/api/animals")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load animals");
        }
        return response.json();
      })
      .then((data) => {
        setAnimals(data);
      })
      .catch((error) => {
        console.error(error);
        setError("Could not load animals");
      });
  }, []);

  return (
    <div>
      <h1>Animal Shelter</h1>

      <h2>Available Animals</h2>

      {error && <p>{error}</p>}

      {animals.map((animal) => (
        <div key={animal.id}>
          <h3>{animal.name}</h3>
          <p>Species: {animal.species}</p>
          <p>Age: {animal.age}</p>
        </div>
      ))}
    </div>
  );
}

export default App;