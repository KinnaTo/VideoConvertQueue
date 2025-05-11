import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@heroui/react";
import authService from "@/services/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!token.trim()) {
      setError("请输入有效的Token");
      return;
    }

    setIsLoading(true);
    setError("");

    // 保存token
    authService.setToken(token.trim());
    
    // 通知父组件认证成功
    onSuccess();
    
    // 关闭模态框
    setIsLoading(false);
    setToken("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isDismissable={false} hideCloseButton>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2>需要认证</h2>
        </ModalHeader>
        <ModalBody>
          <p className="mb-4">请输入您的访问令牌(Token)以继续访问</p>
          <Input
            autoFocus
            label="访问令牌"
            placeholder="输入您的Bearer Token"
            variant="bordered"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            isInvalid={!!error}
            errorMessage={error}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" isLoading={isLoading} onClick={handleSubmit}>
            确认
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 