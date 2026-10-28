//import react hooks
import { useEffect, useState } from "react";

//create the main app component
function App() {

  //store the animals
  const [animals, setAnimals] = useState([]);

  //store any error messages
  const [error, setError] = useState("");

  //run when the page loads
  useEffect(() => {

    //request animals from the backend
    fetch("http://localhost:3001/api/animals")
      .then((response) => {

        //check if the request failed
        if (!response.ok) {
          throw new Error("Failed to load animals");
        }

        //convert the response to json
        return response.json();
      })
      .then((data) => {

        //save the animals in state
        setAnimals(data);
      })
      .catch((error) => {

        //display the error in the console
        console.error(error);

        //save the error message
        setError("Could not load animals");
      });
  }, []);

  //display the website
  return (
    <div>
      {/*display the website title*/}
      <h1>Animal Shelter</h1>

      {/*display the section title*/}
      <h2>Available Animals</h2>

      {/*display an error if one exists*/}
      {error && <p>{error}</p>}

      {/*loop through all animals*/}
      {animals.map((animal) => (
        <div key={animal.id}>

          {/*display the animal name*/}
          <h3>{animal.name}</h3>

          {/*display the animal species*/}
          <p>Species: {animal.species}</p>

          {/*display the animal age*/}
          <p>Age: {animal.age}</p>
        </div>
      ))}
    </div>
  );
}

//export the app component
export default App;