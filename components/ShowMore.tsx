import { CustomButton } from "@/components/index";

interface PropTypes {
  handleShowMore: () => void;
}

const ShowMore = ({ handleShowMore }: PropTypes) => {
  return (
    <div className="flex items-center mt-2 justify-center">
      <CustomButton
        containerStyles="app__btn_green"
        title="Show More..."
        btnType="button"
        handleClick={handleShowMore}
      />
    </div>
  );
};

export default ShowMore;
