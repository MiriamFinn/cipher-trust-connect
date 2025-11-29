import { AlertCircle } from "lucide-react";
import { Card } from "./ui/card";

const ErrorNotDeployed = () => {
  return (
    <Card className="p-8 text-center bg-yellow-50 border-yellow-200">
      <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-yellow-900 mb-2">
        Contract Not Deployed
      </h2>
      <p className="text-yellow-700 mb-4">
        The CipherLending contract is not deployed on this network.
      </p>
      <p className="text-sm text-yellow-600">
        Please deploy the contract first or switch to a network where it is deployed.
      </p>
    </Card>
  );
};

export default ErrorNotDeployed;

