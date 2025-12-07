import { useNavigate } from "react-router-dom";
import Page from "../../components/layout/Page";
import Title from "../../components/ui/Title";
import Button from "../../components/ui/Button";

export default function Start() {
  const navigate = useNavigate();

  return (
    <Page>
      <div className="flex flex-col items-center text-center mt-20">
        <Title>WorkScout</Title>

        <p className="text-gray-600 mb-10">
          Быстрые заказы и исполнители рядом
        </p>

        <Button onClick={() => navigate("/role")}>
          Начать
        </Button>
      </div>
    </Page>
  );
}
