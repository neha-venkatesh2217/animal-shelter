import { useEffect, useState } from "react";
import { formatAge, publicAnimalId } from "./animalDetails";

export default function AnimalProfile({ animalId }) {
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  //load only the requested animal's public details
  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      try {
        const response = await fetch(`http://localhost:3001/api/animals/${encodeURIComponent(animalId)}`, {
          signal: controller.signal,
        });
        if (response.status === 404 || response.status === 400) {
          setError("This animal profile could not be found.");
          return;
        }
        if (!response.ok) throw new Error("Profile request failed");
        setAnimal(await response.json());
      } catch (error) {
        if (error.name !== "AbortError") {
          setError("We couldn't load this profile. Please refresh the page to try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProfile();
    return () => controller.abort();
  }, [animalId]);

  useEffect(() => {
    document.title = animal ? `${animal.name || "Animal profile"} | Animal Shelter` : "Animal profile | Animal Shelter";
    return () => { document.title = "Animal Shelter"; };
  }, [animal]);

  return (
    <div className="profile-page">
      <a className="back-link" href="/#find-an-animal">&larr; Back to all animals</a>
      {loading && <p className="notice" role="status">Loading animal profile...</p>}
      {error && <div className="notice" role="alert"><h1>Animal profile</h1><p>{error}</p></div>}
      {!loading && !error && animal && (
        <>
        <article className="profile-introduction" aria-labelledby="profile-heading">
          <div className="photo-placeholder">
            <span className="photo-symbol" aria-hidden="true">&#9825;</span>
            <span>Photo not yet available</span>
          </div>
          <div className="profile-details">
            <p className="eyebrow">Meet our animals</p>
            <h1 id="profile-heading">{animal.name || "Name not recorded"}</h1>
            <p className="public-id">Animal ID: {publicAnimalId(animal.id)}</p>
            <dl className="profile-facts">
              <div><dt>Species</dt><dd>{animal.species || "Not recorded"}</dd></div>
              <div><dt>Breed/type</dt><dd>{animal.breed_type?.trim() || "Not recorded"}</dd></div>
              <div><dt>Age</dt><dd>{formatAge(animal.age)}</dd></div>
            </dl>
          </div>
        </article>
        <section className="profile-about" aria-labelledby="about-heading">
          <h2 id="about-heading">About {animal.name || "this animal"}</h2>
          <div className="profile-story">
            <h3>Personality and story</h3>
            <p>{animal.description?.trim() || "A description has not been added yet."}</p>
          </div>
          <div className="profile-story">
            <h3>Ideal home</h3>
            <p>{animal.ideal_home?.trim() || "Ideal home information has not been added yet."}</p>
          </div>
          <div className="profile-story">
            <h3>Care needs and routine</h3>
            <p>{animal.care_needs?.trim() || "Care needs and routine information has not been added yet."}</p>
          </div>
        </section>
        </>
      )}
    </div>
  );
}
