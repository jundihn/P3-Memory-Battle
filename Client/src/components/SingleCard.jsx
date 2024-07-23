import "../components/SIngleCard.css";
import PropTypes from "prop-types";

export default function SingleCard({
  card,
  handleChoice,
  flipped,
  disabled,
  test,
}) {
  const handleClick = () => {
    if (!disabled) {
      handleChoice(card);
    }
  };

  return (
    <div className="card" key={test}>
      <div className={flipped ? "flipped" : ""}>
        <img className="front h-full object-cover" src={card.src} alt="card front" />
        <img
          className="back h-full object-cover"
          src="/img/background.jpg"
          onClick={handleClick}
          alt="card back"
        />
      </div>
    </div>
  );
}

SingleCard.propTypes = {
  card: PropTypes.any,
  handleChoice: PropTypes.any,
  flipped: PropTypes.any,
  disabled: PropTypes.any,
  test: PropTypes.any
}
