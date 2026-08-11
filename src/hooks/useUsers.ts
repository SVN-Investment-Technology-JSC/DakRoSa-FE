import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiUser, createUser, getUsers } from '../api/users';

const USERS_KEY = ['users'];

export function useUsers(search?: string) {
  return useQuery({
    queryKey: [...USERS_KEY, search?.trim() || 'all'],
    queryFn: () => getUsers(search),
    // Danh bạ đổi rất chậm; giữ kết quả cũ khi người dùng gõ tiếp để ô tìm kiếm
    // không nháy trắng sau mỗi ký tự.
    placeholderData: (previous) => previous,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      email: string;
      fullName: string;
      password: string;
      roleNames?: string[];
    }) => createUser(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export type { ApiUser };
