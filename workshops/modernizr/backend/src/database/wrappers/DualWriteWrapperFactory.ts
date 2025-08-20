import { DatabaseFactory } from '../factory/DatabaseFactory';
import { UserDualWriteWrapper } from './UserDualWriteWrapper';
import { CartDualWriteWrapper } from './CartDualWriteWrapper';
import { ProductDualWriteWrapper } from './ProductDualWriteWrapper';
import { OrderDualWriteWrapper } from './OrderDualWriteWrapper';
import { CategoryDualWriteWrapper } from './CategoryDualWriteWrapper';

export class DualWriteWrapperFactory {
  constructor() {
    // No need to store FeatureFlagService since wrappers use static methods
  }

  createUserWrapper(): UserDualWriteWrapper {
    const repos = DatabaseFactory.createBothUserRepositories();
    
    return new UserDualWriteWrapper(
      repos.mysql,
      repos.dynamodb
    );
  }

  createCartWrapper(): CartDualWriteWrapper {
    const cartRepos = DatabaseFactory.createBothShoppingCartRepositories();
    const userRepos = DatabaseFactory.createBothUserRepositories();
    const productRepos = DatabaseFactory.createBothProductRepositories();
    
    return new CartDualWriteWrapper(
      cartRepos.mysql,
      cartRepos.dynamodb,
      userRepos.mysql,
      productRepos.mysql
    );
  }

  createProductWrapper(): ProductDualWriteWrapper {
    const repos = DatabaseFactory.createBothProductRepositories();
    
    return new ProductDualWriteWrapper(
      repos.mysql,
      repos.dynamodb
    );
  }

  createOrderWrapper(): OrderDualWriteWrapper {
    const orderRepos = DatabaseFactory.createBothOrderRepositories();
    const userRepos = DatabaseFactory.createBothUserRepositories();
    
    return new OrderDualWriteWrapper(
      orderRepos.mysql,
      orderRepos.dynamodb,
      userRepos.mysql
    );
  }

  createCategoryWrapper(): CategoryDualWriteWrapper {
    const repos = DatabaseFactory.createBothCategoryRepositories();
    
    return new CategoryDualWriteWrapper(
      repos.mysql,
      repos.dynamodb
    );
  }
}
