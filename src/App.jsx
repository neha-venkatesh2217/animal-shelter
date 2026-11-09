//import react hooks and homepage styles
import { useEffect, useState } from "react";
import "./App.css";
import AnimalProfile from "./AnimalProfile";
import { publicAnimalId } from "./animalDetails";

function App() {
  //a profile url can be opened directly or shared with someone else
  const animalId = new URLSearchParams(window.location.search).get("animal");
  //store animals and the request state
  const [animals, setAnimals] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [species, setSpecies] = useState("");
  const [age, setAge] = useState("");
  const [breedType, setBreedType] = useState("");
  const [user, setUser] = useState(null);

  //read the server session without storing login details in the browser
  useEffect(() => {
    const controller = new AbortController();
    fetch("http://localhost:3001/api/session", {
      credentials: "include", signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not check session");
        return response.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  //use only breeds or types recorded for the selected species
  const breedOptions = [...new Set(animals
    .filter((animal) => !species || (animal.species?.trim().toLowerCase() || "unknown") === species)
    .map((animal) => animal.breed_type?.trim().toLowerCase())
    .filter(Boolean))].sort();

  function changeSpecies(value) {
    setSpecies(value);
    setBreedType("");
  }

  //keep missing ages separate from an age of zero
  function ageValue(value) {
    return value === null || value === undefined || value === "" ? "unknown" : String(value);
  }

  function ageLabel(value) {
    if (value === "unknown") return "Age not recorded";
    if (value === "0") return "Under 1 year";
    return `${value} ${value === "1" ? "year" : "years"}`;
  }

  //offer recorded ages in numerical order
  const ageOptions = [...new Set(animals.map((animal) => ageValue(animal.age)))]
    .filter((value) => value !== "unknown")
    .sort((a, b) => Number(a) - Number(b));

  //build species options from the recorded animals
  const speciesOptions = [...new Set(animals.map((animal) =>
    animal.species?.trim().toLowerCase() || "unknown"
  ))].sort();

  //apply all filters without changing the original animal list
  const visibleAnimals = animals.filter((animal) => {
    const searchText = search.trim().toLowerCase();
    const matchesName = (animal.name || "").toLowerCase().includes(searchText)
      || publicAnimalId(animal.id).toLowerCase().includes(searchText);
    const matchesSpecies = !species || (animal.species?.trim().toLowerCase() || "unknown") === species;
    const matchesAge = !age || ageValue(animal.age) === age;
    const matchesBreed = !breedType || (animal.breed_type?.trim().toLowerCase() || "unknown") === breedType;
    return matchesName && matchesSpecies && matchesAge && matchesBreed;
  });

  function clearFilters() {
    setSearch("");
    setSpecies("");
    setAge("");
    setBreedType("");
  }

  //request animals when the page opens
  useEffect(() => {
    if (animalId !== null) return;
    const controller = new AbortController();

    async function loadAnimals() {
      try {
        const response = await fetch("http://localhost:3001/api/animals", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to load animals");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Unexpected animal data");
        setAnimals(data);
      } catch (error) {
        if (error.name !== "AbortError") {
          setError("We couldn't load the animals. Please refresh the page to try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadAnimals();
    return () => controller.abort();
  }, [animalId]);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="header-inner page-width">
          <a className="brand" href="/" aria-label="Animal Shelter home">
            <span className="brand-mark" aria-hidden="true">AS</span>
            <span>Animal Shelter<small>Placeholder shelter name</small></span>
          </a>
          <nav aria-label="Main navigation">
            <a href="/" aria-current={animalId === null ? "page" : undefined}>Home</a>
            <a href="/#find-an-animal">Find an Animal</a>
          </nav>
          <nav className="account-links" aria-label="Account">
            {user ? <>
              <span className="signed-in-user">Hello, {user.username}</span>
              <a href="http://localhost:3001/logout">Logout</a>
            </> : <>
            <a href="/login.html">Login</a>
            <a className="nav-register" href="/register.html">Register</a>
            </>}
          </nav>
        </div>
      </header>

      <main id="main-content" className="page-width">
        {animalId !== null ? <AnimalProfile key={animalId} animalId={animalId} /> : <>
        <section className="introduction" aria-labelledby="welcome-heading">
          <p className="eyebrow">Small moments. Lasting connections.</p>
          <h1 id="welcome-heading">Meet your next companion.</h1>
          <p>Every animal has a story. Start getting to know the animals at our shelter.</p>
          <a className="browse-link" href="#find-an-animal">Meet the animals <span aria-hidden="true">&darr;</span></a>
        </section>

        <div id="find-an-animal" className="animal-finder">
          <fieldset className="browse-controls" disabled={loading || Boolean(error)}>
            <legend>Find an animal</legend>
            <label htmlFor="animal-search">
              Search by name or animal ID
              <input id="animal-search" type="search" placeholder="Name or PET-0001" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label htmlFor="species-filter">
              Species
              <select id="species-filter" value={species} onChange={(event) => changeSpecies(event.target.value)}>
                <option value="">All species</option>
                {speciesOptions.map((option) => (
                  <option key={option} value={option}>{option === "unknown" ? "Species not recorded" : option.charAt(0).toUpperCase() + option.slice(1)}</option>
                ))}
              </select>
            </label>
            <label htmlFor="breed-filter">
              Breed/type
              <select id="breed-filter" value={breedType} onChange={(event) => setBreedType(event.target.value)}>
                <option value="">All breeds/types</option>
                {breedOptions.map((option) => (
                  <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
                ))}
                <option value="unknown">Not recorded</option>
              </select>
            </label>
            <label htmlFor="age-filter">
              Age
              <select id="age-filter" value={age} onChange={(event) => setAge(event.target.value)}>
                <option value="">All ages</option>
                {ageOptions.map((option) => (
                  <option key={option} value={option}>{ageLabel(option)}</option>
                ))}
                <option value="unknown">Age not recorded</option>
              </select>
            </label>
            <button type="button" onClick={clearFilters} disabled={!search && !species && !age && !breedType}>Clear all</button>
          </fieldset>

          {(search || species || age || breedType) && (
            <div className="active-filters" aria-label="Selected filters">
              {search && <button type="button" onClick={() => setSearch("")}>Remove search: {search} &times;</button>}
              {species && <button type="button" onClick={() => changeSpecies("")}>Remove species: {species === "unknown" ? "Not recorded" : species} &times;</button>}
              {breedType && <button type="button" onClick={() => setBreedType("")}>Remove breed/type: {breedType === "unknown" ? "Not recorded" : breedType} &times;</button>}
              {age && <button type="button" onClick={() => setAge("")}>Remove age: {ageLabel(age)} &times;</button>}
            </div>
          )}

        </div>

        <section id="animals" className="animals-section" aria-labelledby="animals-heading">
          <div className="section-heading">
            <div>
              <h2 id="animals-heading">Meet the animals</h2>
            </div>
            <p className="result-count" role="status">
              {loading ? "Loading animals..." : !error ? `${visibleAnimals.length} of ${animals.length} animals` : ""}
            </p>
          </div>

          {error && <p className="notice" role="alert">{error}</p>}
          {!loading && !error && animals.length === 0 && (
            <p className="notice">There are no animals listed yet. Please check back soon.</p>
          )}
          {!loading && !error && animals.length > 0 && visibleAnimals.length === 0 && (
            <p className="notice">No animals match your search. Try another name, species, breed/type, or age, or clear the filters.</p>
          )}

          <div className="animal-grid">
            {visibleAnimals.map((animal) => (
              <article className="animal-card" key={animal.id}>
                {/*use a placeholder until real animal photos are available*/}
                <div className="photo-placeholder">
                  <span className="photo-symbol" aria-hidden="true">&#9825;</span>
                  <span>Photo not yet available</span>
                </div>
                <div className="animal-details">
                  <span className="species-tag">{animal.species || "Species not recorded"}</span>
                  <h3>{animal.name || "Name not recorded"}</h3>
                  <p className="public-id">Animal ID: {publicAnimalId(animal.id)}</p>
                  <p>Breed/type: {animal.breed_type?.trim() || "Not recorded"}</p>
                  <p>Age: {ageValue(animal.age) === "unknown" ? "Not recorded" : ageLabel(ageValue(animal.age))}</p>
                  <a className="profile-link" href={`/?animal=${animal.id}`} aria-label={`View profile for ${animal.name || publicAnimalId(animal.id)}`}>View profile &rarr;</a>
                </div>
              </article>
            ))}
          </div>
        </section>
        </>}
      </main>

      <footer className="site-footer">
        <div className="footer-inner page-width">
          <div><h2>Animal Shelter</h2><p>Placeholder shelter name</p></div>
          <div><h3>Visit the shelter</h3><p>Address: to be added</p><p>Opening hours: to be added</p></div>
          <div><h3>Get in touch</h3><p>Email: to be added</p><p>Phone: to be added</p></div>
        </div>
      </footer>
    </>
  );
}

export default App;
